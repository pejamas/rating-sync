using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Controller.Net;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Serialization;
using MediaBrowser.Model.Tasks;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Services;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Threading;
using System.Threading.Tasks;

namespace RatingSync
{
    #region Progress Tracking

    public class RefreshProgress
    {
        public bool IsRunning { get; set; }
        public int TotalItems { get; set; }
        public int ProcessedItems { get; set; }
        public int UpdatedItems { get; set; }
        public int SkippedItems { get; set; }
        public int ErrorItems { get; set; }
        public double PercentComplete { get; set; }
        public string CurrentItem { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public double? EstimatedSecondsRemaining { get; set; }
        public Dictionary<string, string> UpdatedDetails { get; set; } = new Dictionary<string, string>();
        public Dictionary<string, string> SkippedDetails { get; set; } = new Dictionary<string, string>();
        public Dictionary<string, string> FailureDetails { get; set; } = new Dictionary<string, string>();
    }

    public static class ProgressTracker
    {
        private static readonly object _lock = new object();
        private static RefreshProgress _progress = new RefreshProgress();

        public static RefreshProgress GetProgress()
        {
            lock (_lock)
            {
                // Calculate ETA
                double? eta = null;
                if (_progress.IsRunning && _progress.StartTime.HasValue && _progress.ProcessedItems > 0 && _progress.TotalItems > 0)
                {
                    var elapsed = (DateTime.UtcNow - _progress.StartTime.Value).TotalSeconds;
                    var avgTimePerItem = elapsed / _progress.ProcessedItems;
                    var remainingItems = _progress.TotalItems - _progress.ProcessedItems;
                    eta = avgTimePerItem * remainingItems;
                }

                return new RefreshProgress
                {
                    IsRunning = _progress.IsRunning,
                    TotalItems = _progress.TotalItems,
                    ProcessedItems = _progress.ProcessedItems,
                    UpdatedItems = _progress.UpdatedItems,
                    SkippedItems = _progress.SkippedItems,
                    ErrorItems = _progress.ErrorItems,
                    PercentComplete = _progress.PercentComplete,
                    CurrentItem = _progress.CurrentItem,
                    StartTime = _progress.StartTime,
                    EndTime = _progress.EndTime,
                    EstimatedSecondsRemaining = eta,
                    UpdatedDetails = new Dictionary<string, string>(_progress.UpdatedDetails),
                    SkippedDetails = new Dictionary<string, string>(_progress.SkippedDetails),
                    FailureDetails = new Dictionary<string, string>(_progress.FailureDetails)
                };
            }
        }

        public static void Start(int totalItems)
        {
            lock (_lock)
            {
                _progress = new RefreshProgress
                {
                    IsRunning = true,
                    TotalItems = totalItems,
                    StartTime = DateTime.UtcNow
                };
            }
        }

        public static void Stop()
        {
            lock (_lock)
            {
                _progress.IsRunning = false;
                _progress.EndTime = DateTime.UtcNow;
            }
        }

        public static void UpdateProgress(int processed, int updated, int skipped, int errors, string currentItem)
        {
            lock (_lock)
            {
                _progress.ProcessedItems = processed;
                _progress.UpdatedItems = updated;
                _progress.SkippedItems = skipped;
                _progress.ErrorItems = errors;
                _progress.CurrentItem = currentItem;
                _progress.PercentComplete = _progress.TotalItems > 0 
                    ? (double)processed / _progress.TotalItems * 100 
                    : 0;
            }
        }

        public static void AddUpdated(string itemName, string details)
        {
            lock (_lock)
            {
                _progress.UpdatedDetails[itemName] = details;
            }
        }

        public static void AddSkipped(string itemName, string reason)
        {
            lock (_lock)
            {
                _progress.SkippedDetails[itemName] = reason;
            }
        }

        public static void AddFailure(string itemName, string reason)
        {
            lock (_lock)
            {
                _progress.FailureDetails[itemName] = reason;
            }
        }

        public static void ClearProgress()
        {
            lock (_lock)
            {
                _progress = new RefreshProgress();
            }
        }

        public static void SetMessage(string message)
        {
            lock (_lock)
            {
                _progress.CurrentItem = message;
            }
        }
    }

    public static class SelectedItemsStore
    {
        private static readonly object _lock = new object();
        private static List<BaseItem> _selectedItems = new List<BaseItem>();
        private static bool _hasItems = false;

        public static void SetItems(List<BaseItem> items)
        {
            lock (_lock)
            {
                _selectedItems = items ?? new List<BaseItem>();
                _hasItems = _selectedItems.Count > 0;
            }
        }

        public static List<BaseItem> GetAndClearItems()
        {
            lock (_lock)
            {
                var items = _selectedItems;
                _selectedItems = new List<BaseItem>();
                _hasItems = false;
                return items;
            }
        }

        public static bool HasItems
        {
            get { lock (_lock) { return _hasItems; } }
        }
    }

    #endregion

    #region API Service

    [Route("/RatingSync/Progress", "GET", Summary = "Gets the current progress of the rating refresh task")]
    [Authenticated]
    public class GetProgressRequest : IReturn<RefreshProgress>
    {
    }

    [Route("/RatingSync/ClearProgress", "POST", Summary = "Clears the progress data")]
    [Authenticated]
    public class ClearProgressRequest : IReturnVoid
    {
    }

    [Route("/RatingSync/History", "GET", Summary = "Gets scan history sessions")]
    [Authenticated]
    public class GetHistoryRequest : IReturn<List<ScanSession>>
    {
        public int Count { get; set; }
    }

    [Route("/RatingSync/HistoryReport", "GET", Summary = "Gets a detailed scan report for a session")]
    [Authenticated]
    public class GetHistoryReportRequest : IReturn<ScanSessionReport>
    {
        public string SessionId { get; set; }
    }

    [Route("/RatingSync/ApiCounters", "GET", Summary = "Gets today's API usage counters")]
    [Authenticated]
    public class GetApiCountersRequest : IReturn<ApiCountersResponse>
    {
    }

    [DataContract]
    public class ApiCountersResponse
    {
        [DataMember]
        public string Today { get; set; }

        [DataMember]
        public int OmdbUsed { get; set; }
        [DataMember]
        public int OmdbLimit { get; set; }
        [DataMember]
        public bool OmdbHasKey { get; set; }
        [DataMember]
        public bool OmdbRateLimitEnabled { get; set; }

        [DataMember]
        public int MdbListUsed { get; set; }
        [DataMember]
        public int MdbListLimit { get; set; }
        [DataMember]
        public bool MdbListHasKey { get; set; }
        [DataMember]
        public bool MdbListRateLimitEnabled { get; set; }

        [DataMember]
        public int ImdbScrapesUsed { get; set; }
    }

    [Route("/RatingSync/DeleteScan", "POST", Summary = "Deletes a scan session and its report")]
    [Authenticated]
    public class DeleteScanRequest : IReturn<DeleteScanResponse>
    {
        public string SessionId { get; set; }
    }

    [DataContract]
    public class DeleteScanResponse
    {
        [DataMember]
        public bool Success { get; set; }
        [DataMember]
        public string Message { get; set; }
    }

    [Route("/RatingSync/MissingData", "GET", Summary = "Gets items with missing IMDb or rating data")]
    [Authenticated]
    public class GetMissingDataRequest : IReturn<List<MissingDataItem>>
    {
        public string Type { get; set; } // "movies", "series", "episodes", or empty for all
    }

    [Route("/RatingSync/ItemHistory", "GET", Summary = "Gets scan history for specific items")]
    [Authenticated]
    public class GetItemHistoryRequest : IReturn<List<ItemHistoryEntry>>
    {
        public string Search { get; set; }
        public int Limit { get; set; }
    }

    [Route("/RatingSync/Libraries", "GET", Summary = "Gets available libraries")]
    [Authenticated]
    public class GetLibrariesRequest : IReturn<List<LibraryInfo>>
    {
    }

    [Route("/RatingSync/Series", "GET", Summary = "Gets TV series in a library")]
    [Authenticated]
    public class GetSeriesRequest : IReturn<List<SeriesInfo>>
    {
        public string LibraryId { get; set; }
    }

    [Route("/RatingSync/Seasons", "GET", Summary = "Gets seasons for a series")]
    [Authenticated]
    public class GetSeasonsRequest : IReturn<List<SeasonInfo>>
    {
        public string SeriesId { get; set; }
    }

    [Route("/RatingSync/Episodes", "GET", Summary = "Gets episodes for a season")]
    [Authenticated]
    public class GetEpisodesRequest : IReturn<List<EpisodeInfoDto>>
    {
        public string SeasonId { get; set; }
    }

    [Route("/RatingSync/RunSelected", "POST", Summary = "Runs refresh on selected items")]
    [Authenticated]
    public class RunSelectedRequest : IReturnVoid
    {
        public string LibraryId { get; set; }
        public string SeriesId { get; set; }
        public string SeasonId { get; set; }
        public string EpisodeId { get; set; }
        public string MovieId { get; set; }

        // When scanning at the "All Movies" / "All Series" level, optionally filter to only items added within N days.
        // 0 means no filter.
        public int AddedWithinDays { get; set; }
    }

    [Route("/RatingSync/Movies", "GET", Summary = "Gets movies in a library")]
    [Authenticated]
    public class GetMoviesRequest : IReturn<List<MovieInfo>>
    {
        public string LibraryId { get; set; }
    }

    public class LibraryInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string CollectionType { get; set; }
    }

    public class SeriesInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int? Year { get; set; }
        public string ImdbId { get; set; }
    }

    public class SeasonInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int? SeasonNumber { get; set; }
        public int EpisodeCount { get; set; }
    }

    public class EpisodeInfoDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int? SeasonNumber { get; set; }
        public int? EpisodeNumber { get; set; }
        public string ImdbId { get; set; }
    }

    public class MovieInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int? Year { get; set; }
        public string ImdbId { get; set; }
    }

    public class MissingDataItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public int? Year { get; set; }
        public string SeriesName { get; set; }
        public int? SeasonNumber { get; set; }
        public string SeasonName { get; set; }
        public int? EpisodeNumber { get; set; }
        public string ImdbId { get; set; }
        public bool HasImdbId { get; set; }
        public bool HasCommunityRating { get; set; }
        public bool HasCriticRating { get; set; }
        public float? CommunityRating { get; set; }
        public float? CriticRating { get; set; }
        public string MissingReason { get; set; }
    }

    public class ItemHistoryEntry
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public DateTime? LastScanned { get; set; }
        public float? LastRating { get; set; }
        public float? LastCriticRating { get; set; }
        public string LastChange { get; set; }
        public float? CurrentRating { get; set; }
        public float? CurrentCriticRating { get; set; }
    }

    public class ProgressApiService : IService
    {
        private ILibraryManager _libraryManager;

        public ProgressApiService(ILibraryManager libraryManager)
        {
            _libraryManager = libraryManager;
        }

        private string TryGetSeasonName(Episode episode)
        {
            if (episode == null)
                return null;

            try
            {
                // Some Emby builds expose an actual Season object
                var seasonProp = episode.GetType().GetProperty("Season");
                var seasonObj = seasonProp?.GetValue(episode, null);
                var seasonName = seasonObj?.GetType().GetProperty("Name")?.GetValue(seasonObj, null) as string;
                if (!string.IsNullOrWhiteSpace(seasonName))
                    return seasonName;

                // Otherwise try to resolve a season id (if available)
                var idProp = episode.GetType().GetProperty("SeasonId") ?? episode.GetType().GetProperty("ParentId");
                var idVal = idProp?.GetValue(episode, null);
                if (idVal == null)
                    return null;

                long seasonId;
                if (idVal is long l)
                    seasonId = l;
                else if (idVal is int i)
                    seasonId = i;
                else if (idVal is string s && long.TryParse(s, out var parsed))
                    seasonId = parsed;
                else
                    return null;

                return (_libraryManager.GetItemById(seasonId) as Season)?.Name;
            }
            catch
            {
                return null;
            }
        }

        public object Get(GetProgressRequest request)
        {
            return ProgressTracker.GetProgress();
        }

        public object Get(GetHistoryRequest request)
        {
            var count = request.Count > 0 ? request.Count : 20;
            return ScanHistoryManager.GetSessions(count);
        }

        public object Get(GetHistoryReportRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
                return null;
            return ScanHistoryManager.GetReport(request.SessionId);
        }

        public object Get(GetApiCountersRequest request)
        {
            var config = Plugin.Instance.Configuration;
            var todayKey = DateTime.UtcNow.ToString("yyyy-MM-dd");

            return new ApiCountersResponse
            {
                Today = todayKey,
                OmdbUsed = ScanHistoryManager.GetTodayRequestCount("omdb"),
                OmdbLimit = config?.OmdbDailyLimit ?? 0,
                OmdbHasKey = config != null && !string.IsNullOrWhiteSpace(config.OmdbApiKey),
                OmdbRateLimitEnabled = config?.OmdbRateLimitEnabled ?? false,
                MdbListUsed = ScanHistoryManager.GetTodayRequestCount("mdblist"),
                MdbListLimit = config?.MdbListDailyLimit ?? 0,
                MdbListHasKey = config != null && !string.IsNullOrWhiteSpace(config.MdbListApiKey),
                MdbListRateLimitEnabled = config?.MdbListRateLimitEnabled ?? false,
                ImdbScrapesUsed = ScanHistoryManager.GetTodayImdbScrapeCount()
            };
        }

        public object Post(DeleteScanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
                return new DeleteScanResponse { Success = false, Message = "Missing SessionId" };

            var result = ScanHistoryManager.DeleteSession(request.SessionId, out var message);
            if (result)
            {
                ScanHistoryManager.Save();
            }

            return new DeleteScanResponse { Success = result, Message = message };
        }

        public object Get(GetMissingDataRequest request)
        {
            var results = new List<MissingDataItem>();
            var itemTypes = new List<string>();
            
            if (string.IsNullOrEmpty(request.Type) || request.Type == "movies")
                itemTypes.Add("Movie");
            if (string.IsNullOrEmpty(request.Type) || request.Type == "series")
                itemTypes.Add("Series");
            if (string.IsNullOrEmpty(request.Type) || request.Type == "episodes")
                itemTypes.Add("Episode");
            
            var items = _libraryManager.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = itemTypes.ToArray(),
                Recursive = true
            });
            
            foreach (var item in items)
            {
                var imdbId = item.GetProviderId(MetadataProviders.Imdb);
                var hasImdb = !string.IsNullOrEmpty(imdbId);
                var hasRating = item.CommunityRating.HasValue;
                var hasCritic = item.CriticRating.HasValue;

                // Episodes often don't have an IMDb ID in Emby; only flag Episodes if rating is missing.
                var isEpisode = item is Episode;

                // Skip Specials / Season 0 episodes entirely
                if (isEpisode)
                {
                    var ep = (Episode)item;
                    var seasonNum = ep.ParentIndexNumber ?? 0;
                    if (seasonNum == 0)
                        continue;
                }

                var include = isEpisode ? !hasRating : (!hasImdb || !hasRating || !hasCritic);

                if (include)
                {
                    string missingReason = "";
                    if (isEpisode)
                    {
                        if (!hasRating) missingReason = "No Community Rating";
                    }
                    else
                    {
                        var reasons = new List<string>();
                        if (!hasImdb) reasons.Add("No IMDb ID");
                        if (!hasRating) reasons.Add("No Community Rating");
                        if (!hasCritic) reasons.Add("No Critic Rating");
                        missingReason = string.Join("; ", reasons);
                    }
                    
                    string typeName = "Unknown";
                    int? year = null;

                    string seriesName = null;
                    int? seasonNumber = null;
                    string seasonName = null;
                    int? episodeNumber = null;
                    
                    if (item is Movie movie)
                    {
                        typeName = "Movie";
                        year = movie.ProductionYear;
                    }
                    else if (item is MediaBrowser.Controller.Entities.TV.Series series)
                    {
                        typeName = "Series";
                        year = series.ProductionYear;
                    }
                    else if (item is Episode episode)
                    {
                        typeName = "Episode";
                        year = episode.ProductionYear;

                        seriesName = episode.SeriesName;
                        seasonNumber = episode.ParentIndexNumber;
                        seasonName = TryGetSeasonName(episode);
                        episodeNumber = episode.IndexNumber;
                    }
                    
                    results.Add(new MissingDataItem
                    {
                        Id = item.InternalId.ToString(),
                        Name = item.Name,
                        Type = typeName,
                        Year = year,
                        SeriesName = seriesName,
                        SeasonNumber = seasonNumber,
                        SeasonName = seasonName,
                        EpisodeNumber = episodeNumber,
                        ImdbId = imdbId,
                        HasImdbId = hasImdb,
                        HasCommunityRating = hasRating,
                        HasCriticRating = hasCritic,
                        CommunityRating = item.CommunityRating,
                        CriticRating = item.CriticRating,
                        MissingReason = missingReason
                    });
                }
            }
            
            return results.OrderBy(r => r.Type).ThenBy(r => r.Name).Take(500).ToList();
        }

        public object Get(GetItemHistoryRequest request)
        {
            var results = new List<ItemHistoryEntry>();
            var historyEntries = ScanHistoryManager.GetAllEntries();
            var search = request.Search?.ToLowerInvariant() ?? "";
            var limit = request.Limit > 0 ? request.Limit : 100;
            
            // Get all items with history
            foreach (var kvp in historyEntries)
            {
                if (long.TryParse(kvp.Key, out var itemId))
                {
                    var item = _libraryManager.GetItemById(itemId);
                    if (item != null)
                    {
                        // Filter by search if provided
                        if (!string.IsNullOrEmpty(search) && !item.Name.ToLowerInvariant().Contains(search))
                            continue;
                        
                        string typeName = "Unknown";
                        if (item is Movie) typeName = "Movie";
                        else if (item is MediaBrowser.Controller.Entities.TV.Series) typeName = "Series";
                        else if (item is Episode) typeName = "Episode";
                        
                        results.Add(new ItemHistoryEntry
                        {
                            Id = kvp.Key,
                            Name = item.Name,
                            Type = typeName,
                            LastScanned = kvp.Value.LastScanned,
                            LastRating = kvp.Value.LastRating,
                            LastCriticRating = kvp.Value.LastCriticRating,
                            LastChange = kvp.Value.LastChange,
                            CurrentRating = item.CommunityRating,
                            CurrentCriticRating = item.CriticRating
                        });
                    }
                }
            }
            
            return results.OrderByDescending(r => r.LastScanned).Take(limit).ToList();
        }

        public object Get(GetLibrariesRequest request)
        {
            var libraries = _libraryManager.GetVirtualFolders()
                .Where(f => f.CollectionType == "movies" || f.CollectionType == "tvshows" || string.IsNullOrEmpty(f.CollectionType))
                .Select(f => new LibraryInfo
                {
                    Id = f.ItemId,
                    Name = f.Name,
                    CollectionType = f.CollectionType ?? "mixed"
                })
                .ToList();
            return libraries;
        }

        public object Get(GetSeriesRequest request)
        {
            var query = new InternalItemsQuery
            {
                IncludeItemTypes = new[] { "Series" },
                Recursive = true
            };
            
            var allSeries = _libraryManager.GetItemList(query)
                .OfType<MediaBrowser.Controller.Entities.TV.Series>();
            
            // Filter by library if specified
            if (!string.IsNullOrEmpty(request.LibraryId))
            {
                // Library ItemId could be a GUID string or a long - find library by matching
                var targetLibraryId = request.LibraryId;
                var virtualFolders = _libraryManager.GetVirtualFolders();
                var matchingFolder = virtualFolders.FirstOrDefault(f => f.ItemId == targetLibraryId);
                
                if (matchingFolder != null)
                {
                    // Filter series by checking if they're in the library's paths
                    var libraryPaths = matchingFolder.Locations.Select(l => l.ToLowerInvariant()).ToList();
                    allSeries = allSeries.Where(s => {
                        var seriesPath = s.Path?.ToLowerInvariant() ?? "";
                        return libraryPaths.Any(lp => seriesPath.StartsWith(lp));
                    });
                }
            }
            
            var series = allSeries
                .OrderBy(s => s.Name)
                .Select(s => new SeriesInfo
                {
                    Id = s.InternalId.ToString(),
                    Name = s.Name,
                    Year = s.ProductionYear,
                    ImdbId = s.GetProviderId(MetadataProviders.Imdb)
                })
                .ToList();
            return series;
        }

        public object Get(GetSeasonsRequest request)
        {
            if (string.IsNullOrEmpty(request.SeriesId))
                return new List<SeasonInfo>();

            var seriesId = long.Parse(request.SeriesId);
            var series = _libraryManager.GetItemById(seriesId) as MediaBrowser.Controller.Entities.TV.Series;
            if (series == null)
                return new List<SeasonInfo>();

            var seasons = series.GetRecursiveChildren()
                .OfType<Season>()
                .Where(s => (s.IndexNumber ?? 0) != 0) // Skip Specials / Season 0
                .OrderBy(s => s.IndexNumber ?? 0)
                .Select(s => new SeasonInfo
                {
                    Id = s.InternalId.ToString(),
                    Name = s.Name,
                    SeasonNumber = s.IndexNumber,
                    EpisodeCount = s.GetRecursiveChildren().OfType<Episode>().Count()
                })
                .ToList();
            return seasons;
        }

        public object Get(GetEpisodesRequest request)
        {
            if (string.IsNullOrEmpty(request.SeasonId))
                return new List<EpisodeInfoDto>();

            var seasonId = long.Parse(request.SeasonId);
            var season = _libraryManager.GetItemById(seasonId) as Season;
            if (season == null)
                return new List<EpisodeInfoDto>();

            var episodes = season.GetRecursiveChildren()
                .OfType<Episode>()
                .OrderBy(e => e.IndexNumber ?? 0)
                .Select(e => new EpisodeInfoDto
                {
                    Id = e.InternalId.ToString(),
                    Name = e.Name,
                    SeasonNumber = e.ParentIndexNumber,
                    EpisodeNumber = e.IndexNumber,
                    ImdbId = e.GetProviderId(MetadataProviders.Imdb)
                })
                .ToList();
            return episodes;
        }

        public object Get(GetMoviesRequest request)
        {
            var query = new InternalItemsQuery
            {
                IncludeItemTypes = new[] { "Movie" },
                Recursive = true
            };
            
            var allMovies = _libraryManager.GetItemList(query)
                .OfType<Movie>();
            
            // Filter by library if specified
            if (!string.IsNullOrEmpty(request.LibraryId))
            {
                var targetLibraryId = request.LibraryId;
                var virtualFolders = _libraryManager.GetVirtualFolders();
                var matchingFolder = virtualFolders.FirstOrDefault(f => f.ItemId == targetLibraryId);
                
                if (matchingFolder != null)
                {
                    var libraryPaths = matchingFolder.Locations.Select(l => l.ToLowerInvariant()).ToList();
                    allMovies = allMovies.Where(m => {
                        var moviePath = m.Path?.ToLowerInvariant() ?? "";
                        return libraryPaths.Any(lp => moviePath.StartsWith(lp));
                    });
                }
            }
            
            var movies = allMovies
                .OrderBy(m => m.Name)
                .Select(m => new MovieInfo
                {
                    Id = m.InternalId.ToString(),
                    Name = m.Name,
                    Year = m.ProductionYear,
                    ImdbId = m.GetProviderId(MetadataProviders.Imdb)
                })
                .ToList();
            return movies;
        }

        public void Post(RunSelectedRequest request)
        {
            // Build list of items to scan based on selection level
            var items = new List<BaseItem>();
            
            // Handle movie selection
            if (!string.IsNullOrEmpty(request.MovieId))
            {
                // Scan specific movie
                var movieId = long.Parse(request.MovieId);
                var movie = _libraryManager.GetItemById(movieId) as Movie;
                if (movie != null) items.Add(movie);
            }
            else if (!string.IsNullOrEmpty(request.EpisodeId))
            {
                // Scan specific episode
                var episodeId = long.Parse(request.EpisodeId);
                var episode = _libraryManager.GetItemById(episodeId) as Episode;
                if (episode != null && (episode.ParentIndexNumber ?? 0) != 0) items.Add(episode);
            }
            else if (!string.IsNullOrEmpty(request.SeasonId))
            {
                // Scan all episodes in season
                var seasonId = long.Parse(request.SeasonId);
                var season = _libraryManager.GetItemById(seasonId) as Season;
                if (season != null)
                {
                    items.AddRange(season.GetRecursiveChildren().OfType<Episode>().Where(e => (e.ParentIndexNumber ?? 0) != 0));
                }
            }
            else if (!string.IsNullOrEmpty(request.SeriesId))
            {
                // Scan series AND all episodes in series
                var seriesId = long.Parse(request.SeriesId);
                var series = _libraryManager.GetItemById(seriesId) as MediaBrowser.Controller.Entities.TV.Series;
                if (series != null)
                {
                    // Add the series itself first
                    items.Add(series);
                    // Then add all episodes
                    items.AddRange(series.GetRecursiveChildren().OfType<Episode>().Where(e => (e.ParentIndexNumber ?? 0) != 0));
                }
            }
            else if (!string.IsNullOrEmpty(request.LibraryId))
            {
                // Get library info to determine type
                var virtualFolders = _libraryManager.GetVirtualFolders();
                var matchingFolder = virtualFolders.FirstOrDefault(f => f.ItemId == request.LibraryId);
                
                if (matchingFolder != null)
                {
                    var libraryPaths = matchingFolder.Locations.Select(l => l.ToLowerInvariant()).ToList();
                    
                    if (matchingFolder.CollectionType == "movies")
                    {
                        // Scan all movies in library
                        var allMovies = _libraryManager.GetItemList(new InternalItemsQuery
                        {
                            IncludeItemTypes = new[] { "Movie" },
                            Recursive = true
                        }).OfType<Movie>().Where(m => {
                            var moviePath = m.Path?.ToLowerInvariant() ?? "";
                            return libraryPaths.Any(lp => moviePath.StartsWith(lp));
                        });
                        items.AddRange(allMovies);
                    }
                    else
                    {
                        // Scan all series AND episodes in TV library
                        var allSeries = _libraryManager.GetItemList(new InternalItemsQuery
                        {
                            IncludeItemTypes = new[] { "Series" },
                            Recursive = true
                        }).OfType<MediaBrowser.Controller.Entities.TV.Series>().Where(s => {
                            var seriesPath = s.Path?.ToLowerInvariant() ?? "";
                            return libraryPaths.Any(lp => seriesPath.StartsWith(lp));
                        });
                        
                        foreach (var series in allSeries)
                        {
                            // Add the series itself
                            items.Add(series);
                            // Then add all episodes
                            items.AddRange(series.GetRecursiveChildren().OfType<Episode>().Where(e => (e.ParentIndexNumber ?? 0) != 0));
                        }
                    }
                }
            }

            // Optional filter for "all movies" / "all series" runs: only include recently added items.
            var hasSpecificTarget = !string.IsNullOrEmpty(request.MovieId)
                || !string.IsNullOrEmpty(request.EpisodeId)
                || !string.IsNullOrEmpty(request.SeasonId)
                || !string.IsNullOrEmpty(request.SeriesId);

            if (!hasSpecificTarget && request.AddedWithinDays > 0 && items.Count > 0)
            {
                var days = request.AddedWithinDays;
                // Interpret "Today"/"Last N days" as inclusive of today (UTC midnight boundary).
                var cutoff = DateTime.UtcNow.Date.AddDays(-(days - 1));
                items = items.Where(i => i != null && i.DateCreated >= cutoff).ToList();
            }
            
            if (items.Count > 0)
            {
                // Store selected items for the task to pick up
                SelectedItemsStore.SetItems(items);
                if (!hasSpecificTarget && request.AddedWithinDays > 0)
                {
                    ProgressTracker.SetMessage($"Queued {items.Count} items (added last {request.AddedWithinDays} day(s))");
                }
                else
                {
                    ProgressTracker.SetMessage($"Queued {items.Count} items for selected scan");
                }
            }
        }

        public void Post(ClearProgressRequest request)
        {
            ProgressTracker.ClearProgress();
        }
    }

    #endregion

    #region Plugin

    public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IHasThumbImage
    {
        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
            // Initialize scan history with plugin data path
            ScanHistoryManager.Initialize(applicationPaths.PluginConfigurationsPath);
        }

        public override string Name => "Rating Sync";

        public override Guid Id => new Guid("12345678-1234-1234-1234-123456789012");

        public override string Description => "Refreshes community and critic ratings from IMDb and Rotten Tomatoes";

        public static Plugin Instance { get; private set; }

        public Stream GetThumbImage()
        {
            return GetType().Assembly.GetManifestResourceStream(GetType().Namespace + ".images.logo.jpg");
        }

        public ImageFormat ThumbImageFormat => ImageFormat.Jpg;

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "RatingSyncConfiguration",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html"
                },
                new PluginPageInfo
                {
                    Name = "RatingSyncConfigurationjs",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.js"
                }
            };
        }
    }

    #endregion

    #region Configuration

    public class PluginConfiguration : BasePluginConfiguration
    {
        // API Keys
        public string OmdbApiKey { get; set; }
        public string MdbListApiKey { get; set; }
        
        // Rate Limiting - OMDb
        public bool OmdbRateLimitEnabled { get; set; }
        public int OmdbDailyLimit { get; set; }
        
        // Rate Limiting - MDBList
        public bool MdbListRateLimitEnabled { get; set; }
        public int MdbListDailyLimit { get; set; }
        
        // Rating Options
        public RatingSource PreferredSource { get; set; }
        public bool UpdateCriticRating { get; set; }
        
        // Item Types
        public bool UpdateMovies { get; set; }
        public bool UpdateSeries { get; set; }
        public bool UpdateEpisodes { get; set; }
        
        // IMDb unofficial API (imdbapi.dev) + optional imdb.com last resort; persisted key name unchanged.
        public bool EnableImdbScraping { get; set; }
        
        // Smart Scanning
        public int RescanIntervalDays { get; set; }
        public bool PrioritizeRecentlyAdded { get; set; }
        public int RecentlyAddedDays { get; set; }
        public bool SkipUnratedOnly { get; set; }
        
        // Testing
        public bool TestMode { get; set; }

        public PluginConfiguration()
        {
            OmdbApiKey = string.Empty;
            MdbListApiKey = string.Empty;
            OmdbRateLimitEnabled = true;
            OmdbDailyLimit = 1000;
            MdbListRateLimitEnabled = true;
            MdbListDailyLimit = 1000;
            PreferredSource = RatingSource.OMDb;
            UpdateCriticRating = true;
            UpdateMovies = true;
            UpdateSeries = true;
            UpdateEpisodes = false;
            EnableImdbScraping = false;
            RescanIntervalDays = 30;
            PrioritizeRecentlyAdded = true;
            RecentlyAddedDays = 7;
            SkipUnratedOnly = false;
            TestMode = false;
        }
    }

    public enum RatingSource
    {
        OMDb,
        MDBList,
        Both
    }

    #endregion

    #region Scan History

    [DataContract]
    public class ScanHistoryEntry
    {
        [DataMember]
        public DateTime LastScanned { get; set; }
        [DataMember]
        public float? LastRating { get; set; }
        [DataMember]
        public float? LastCriticRating { get; set; }
        [DataMember]
        public string LastChange { get; set; }
    }

    [DataContract]
    public class ScanSession
    {
        [DataMember]
        public string SessionId { get; set; }
        [DataMember]
        public DateTime StartTime { get; set; }
        [DataMember]
        public DateTime? EndTime { get; set; }
        [DataMember]
        public int TotalItems { get; set; }
        [DataMember]
        public int ProcessedItems { get; set; }
        [DataMember]
        public int UpdatedItems { get; set; }
        [DataMember]
        public int SkippedItems { get; set; }
        [DataMember]
        public int ErrorItems { get; set; }

        [DataMember]
        public int OmdbRequests { get; set; }
        [DataMember]
        public int MdbListRequests { get; set; }
        [DataMember]
        public int ImdbScrapeRequests { get; set; }
        [DataMember]
        public bool WasCancelled { get; set; }
        [DataMember]
        public List<string> UpdatedItemNames { get; set; } = new List<string>();

        // Report samples (capped to avoid bloating scan_history.json)
        [DataMember]
        public Dictionary<string, string> UpdatedDetails { get; set; } = new Dictionary<string, string>();
        [DataMember]
        public Dictionary<string, string> SkippedDetails { get; set; } = new Dictionary<string, string>();
        [DataMember]
        public Dictionary<string, string> FailureDetails { get; set; } = new Dictionary<string, string>();
    }

    [DataContract]
    public class ScanReportEntry
    {
        [DataMember]
        public string Name { get; set; }
        [DataMember]
        public string Detail { get; set; }
    }

    [DataContract]
    public class ScanSessionReport
    {
        [DataMember]
        public string SessionId { get; set; }
        [DataMember]
        public DateTime StartTime { get; set; }
        [DataMember]
        public DateTime? EndTime { get; set; }
        [DataMember]
        public int TotalItems { get; set; }
        [DataMember]
        public int ProcessedItems { get; set; }
        [DataMember]
        public int UpdatedItems { get; set; }
        [DataMember]
        public int SkippedItems { get; set; }
        [DataMember]
        public int ErrorItems { get; set; }
        [DataMember]
        public bool WasCancelled { get; set; }

        [DataMember]
        public int OmdbRequests { get; set; }
        [DataMember]
        public int MdbListRequests { get; set; }
        [DataMember]
        public int ImdbScrapeRequests { get; set; }

        [DataMember]
        public List<ScanReportEntry> Updated { get; set; } = new List<ScanReportEntry>();
        [DataMember]
        public List<ScanReportEntry> Skipped { get; set; } = new List<ScanReportEntry>();
        [DataMember]
        public List<ScanReportEntry> Errors { get; set; } = new List<ScanReportEntry>();
    }

    [DataContract]
    public class ScanHistory
    {
        [DataMember]
        public Dictionary<string, ScanHistoryEntry> Items { get; set; } = new Dictionary<string, ScanHistoryEntry>();
        [DataMember]
        public Dictionary<string, int> OmdbDailyRequests { get; set; } = new Dictionary<string, int>();
        [DataMember]
        public Dictionary<string, int> MdbListDailyRequests { get; set; } = new Dictionary<string, int>();

        [DataMember]
        public Dictionary<string, int> ImdbDailyScrapes { get; set; } = new Dictionary<string, int>();
        [DataMember]
        public List<ScanSession> Sessions { get; set; } = new List<ScanSession>();
        
        public int GetTodayRequestCount(string api)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var dict = api == "omdb" ? OmdbDailyRequests : MdbListDailyRequests;
            return dict.TryGetValue(today, out var count) ? count : 0;
        }

        public int GetTodayImdbScrapeCount()
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            return ImdbDailyScrapes != null && ImdbDailyScrapes.TryGetValue(today, out var count) ? count : 0;
        }
        
        public void IncrementRequestCount(string api, int amount = 1)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var dict = api == "omdb" ? OmdbDailyRequests : MdbListDailyRequests;
            
            if (dict.ContainsKey(today))
                dict[today] += amount;
            else
                dict[today] = amount;
            
            // Clean up old entries (keep last 7 days)
            var cutoff = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
            var keysToRemove = dict.Keys.Where(k => string.Compare(k, cutoff) < 0).ToList();
            foreach (var key in keysToRemove)
                dict.Remove(key);
        }

        public void IncrementImdbScrapeCount(int amount = 1)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            if (ImdbDailyScrapes == null) ImdbDailyScrapes = new Dictionary<string, int>();

            if (ImdbDailyScrapes.ContainsKey(today))
                ImdbDailyScrapes[today] += amount;
            else
                ImdbDailyScrapes[today] = amount;

            // Clean up old entries (keep last 7 days)
            var cutoff = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
            var keysToRemove = ImdbDailyScrapes.Keys.Where(k => string.Compare(k, cutoff) < 0).ToList();
            foreach (var key in keysToRemove)
                ImdbDailyScrapes.Remove(key);
        }
    }

    public static class ScanHistoryManager
    {
        private static ScanHistory _history;
        private static readonly object _lock = new object();
        private static string _historyPath;
        private static string _reportsDir;

        public static void Initialize(string dataPath)
        {
            _historyPath = Path.Combine(dataPath, "scan_history.json");
            _reportsDir = Path.Combine(dataPath, "scan_reports");
            try
            {
                if (!Directory.Exists(_reportsDir))
                    Directory.CreateDirectory(_reportsDir);
            }
            catch { }
            Load();
        }

        private static string GetReportPath(string sessionId)
        {
            if (string.IsNullOrWhiteSpace(_reportsDir) || string.IsNullOrWhiteSpace(sessionId))
                return null;
            return Path.Combine(_reportsDir, sessionId + ".json");
        }

        private static void Load()
        {
            lock (_lock)
            {
                try
                {
                    if (File.Exists(_historyPath))
                    {
                        var serializer = new DataContractJsonSerializer(typeof(ScanHistory));
                        using (var stream = File.OpenRead(_historyPath))
                        {
                            _history = (ScanHistory)serializer.ReadObject(stream) ?? new ScanHistory();
                        }
                        // Ensure all collections are initialized (for backward compatibility)
                        if (_history.Items == null) _history.Items = new Dictionary<string, ScanHistoryEntry>();
                        if (_history.Sessions == null) _history.Sessions = new List<ScanSession>();
                        if (_history.OmdbDailyRequests == null) _history.OmdbDailyRequests = new Dictionary<string, int>();
                        if (_history.MdbListDailyRequests == null) _history.MdbListDailyRequests = new Dictionary<string, int>();
                        if (_history.ImdbDailyScrapes == null) _history.ImdbDailyScrapes = new Dictionary<string, int>();

                        foreach (var session in _history.Sessions)
                        {
                            if (session == null) continue;
                            if (session.UpdatedItemNames == null) session.UpdatedItemNames = new List<string>();
                            if (session.UpdatedDetails == null) session.UpdatedDetails = new Dictionary<string, string>();
                            if (session.SkippedDetails == null) session.SkippedDetails = new Dictionary<string, string>();
                            if (session.FailureDetails == null) session.FailureDetails = new Dictionary<string, string>();
                        }
                    }
                    else
                    {
                        _history = new ScanHistory();
                    }
                }
                catch
                {
                    _history = new ScanHistory();
                }
            }
        }

        public static void Save()
        {
            lock (_lock)
            {
                try
                {
                    var serializer = new DataContractJsonSerializer(typeof(ScanHistory));
                    using (var stream = File.Create(_historyPath))
                    {
                        serializer.WriteObject(stream, _history);
                    }
                }
                catch { }
            }
        }

        public static ScanHistoryEntry GetEntry(string itemId)
        {
            lock (_lock)
            {
                return _history.Items.TryGetValue(itemId, out var entry) ? entry : null;
            }
        }

        public static void SetEntry(string itemId, float? rating)
        {
            lock (_lock)
            {
                _history.Items[itemId] = new ScanHistoryEntry
                {
                    LastScanned = DateTime.UtcNow,
                    LastRating = rating
                };
            }
        }

        public static int GetTodayRequestCount(string api)
        {
            lock (_lock)
            {
                return _history.GetTodayRequestCount(api);
            }
        }

        public static void IncrementRequestCount(string api, int amount = 1)
        {
            lock (_lock)
            {
                _history.IncrementRequestCount(api, amount);
            }
        }

        public static int GetTodayImdbScrapeCount()
        {
            lock (_lock)
            {
                return _history.GetTodayImdbScrapeCount();
            }
        }

        public static void IncrementImdbScrapeCount(int amount = 1)
        {
            lock (_lock)
            {
                _history.IncrementImdbScrapeCount(amount);
            }
        }

        public static void CleanupOldEntries(int keepDays = 90)
        {
            lock (_lock)
            {
                var cutoff = DateTime.UtcNow.AddDays(-keepDays);
                var keysToRemove = _history.Items.Where(kvp => kvp.Value.LastScanned < cutoff).Select(kvp => kvp.Key).ToList();
                foreach (var key in keysToRemove)
                    _history.Items.Remove(key);
                
                // Also cleanup old sessions (keep last 50)
                if (_history.Sessions.Count > 50)
                {
                    _history.Sessions = _history.Sessions.OrderByDescending(s => s.StartTime).Take(50).ToList();
                }
            }
        }

        public static ScanSession StartSession(int totalItems)
        {
            lock (_lock)
            {
                var session = new ScanSession
                {
                    SessionId = Guid.NewGuid().ToString("N"),
                    StartTime = DateTime.UtcNow,
                    TotalItems = totalItems
                };
                _history.Sessions.Insert(0, session);
                return session;
            }
        }

        public static void EndSession(ScanSession session, int processed, int updated, int skipped, int errors, bool cancelled,
            int omdbRequests,
            int mdbListRequests,
            int imdbScrapeRequests,
            List<string> updatedNames,
            Dictionary<string, string> updatedDetails,
            Dictionary<string, string> skippedDetails,
            Dictionary<string, string> failureDetails)
        {
            lock (_lock)
            {
                session.EndTime = DateTime.UtcNow;
                session.ProcessedItems = processed;
                session.UpdatedItems = updated;
                session.SkippedItems = skipped;
                session.ErrorItems = errors;
                session.WasCancelled = cancelled;
                session.OmdbRequests = omdbRequests;
                session.MdbListRequests = mdbListRequests;
                session.ImdbScrapeRequests = imdbScrapeRequests;
                session.UpdatedItemNames = updatedNames.Take(100).ToList(); // Keep last 100 item names per session

                session.UpdatedDetails = (updatedDetails ?? new Dictionary<string, string>()).Take(100).ToDictionary(k => k.Key, v => v.Value);
                session.SkippedDetails = (skippedDetails ?? new Dictionary<string, string>()).Take(100).ToDictionary(k => k.Key, v => v.Value);
                session.FailureDetails = (failureDetails ?? new Dictionary<string, string>()).Take(200).ToDictionary(k => k.Key, v => v.Value);
            }
        }

        public static List<ScanSession> GetSessions(int count = 20)
        {
            lock (_lock)
            {
                return _history.Sessions.Take(count).ToList();
            }
        }

        public static void SaveReport(ScanSession session,
            Dictionary<string, string> updatedDetails,
            Dictionary<string, string> skippedDetails,
            Dictionary<string, string> failureDetails)
        {
            if (session == null || string.IsNullOrWhiteSpace(session.SessionId))
                return;

            var path = GetReportPath(session.SessionId);
            if (string.IsNullOrWhiteSpace(path))
                return;

            var report = new ScanSessionReport
            {
                SessionId = session.SessionId,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                TotalItems = session.TotalItems,
                ProcessedItems = session.ProcessedItems,
                UpdatedItems = session.UpdatedItems,
                SkippedItems = session.SkippedItems,
                ErrorItems = session.ErrorItems,
                WasCancelled = session.WasCancelled,
                OmdbRequests = session.OmdbRequests,
                MdbListRequests = session.MdbListRequests,
                ImdbScrapeRequests = session.ImdbScrapeRequests,
                Updated = (updatedDetails ?? new Dictionary<string, string>()).Select(kvp => new ScanReportEntry { Name = kvp.Key, Detail = kvp.Value }).ToList(),
                Skipped = (skippedDetails ?? new Dictionary<string, string>()).Select(kvp => new ScanReportEntry { Name = kvp.Key, Detail = kvp.Value }).ToList(),
                Errors = (failureDetails ?? new Dictionary<string, string>()).Select(kvp => new ScanReportEntry { Name = kvp.Key, Detail = kvp.Value }).ToList(),
            };

            lock (_lock)
            {
                try
                {
                    var serializer = new DataContractJsonSerializer(typeof(ScanSessionReport));
                    using (var stream = File.Create(path))
                    {
                        serializer.WriteObject(stream, report);
                    }
                }
                catch { }
            }
        }

        public static ScanSessionReport GetReport(string sessionId)
        {
            if (string.IsNullOrWhiteSpace(sessionId))
                return null;

            var path = GetReportPath(sessionId);
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
                return null;

            lock (_lock)
            {
                try
                {
                    var serializer = new DataContractJsonSerializer(typeof(ScanSessionReport));
                    using (var stream = File.OpenRead(path))
                    {
                        return (ScanSessionReport)serializer.ReadObject(stream);
                    }
                }
                catch
                {
                    return null;
                }
            }
        }

        public static void CleanupOldReports(int keepSessions = 20)
        {
            if (string.IsNullOrWhiteSpace(_reportsDir) || !Directory.Exists(_reportsDir))
                return;

            lock (_lock)
            {
                try
                {
                    var keepIds = new HashSet<string>(_history.Sessions
                        .Where(s => s != null && !string.IsNullOrWhiteSpace(s.SessionId))
                        .OrderByDescending(s => s.StartTime)
                        .Take(keepSessions)
                        .Select(s => s.SessionId));

                    var files = Directory.GetFiles(_reportsDir, "*.json");
                    foreach (var file in files)
                    {
                        var id = Path.GetFileNameWithoutExtension(file);
                        if (!keepIds.Contains(id))
                        {
                            try { File.Delete(file); } catch { }
                        }
                    }
                }
                catch { }
            }
        }

        public static void UpdateItemEntry(string itemId, float? rating, float? criticRating, string change)
        {
            lock (_lock)
            {
                _history.Items[itemId] = new ScanHistoryEntry
                {
                    LastScanned = DateTime.UtcNow,
                    LastRating = rating,
                    LastCriticRating = criticRating,
                    LastChange = change
                };
            }
        }

        public static bool DeleteSession(string sessionId, out string message)
        {
            message = null;
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                message = "Missing SessionId";
                return false;
            }

            lock (_lock)
            {
                var session = _history.Sessions.FirstOrDefault(s => s != null && string.Equals(s.SessionId, sessionId, StringComparison.OrdinalIgnoreCase));
                if (session == null)
                {
                    message = "Scan not found";
                    return false;
                }

                // Avoid deleting in-progress scans
                if (!session.EndTime.HasValue && !session.WasCancelled)
                {
                    message = "Cannot delete a scan that is still in progress";
                    return false;
                }

                _history.Sessions.Remove(session);

                try
                {
                    var reportPath = GetReportPath(sessionId);
                    if (!string.IsNullOrWhiteSpace(reportPath) && File.Exists(reportPath))
                        File.Delete(reportPath);
                }
                catch { }

                message = "Scan deleted";
                return true;
            }
        }

        public static Dictionary<string, ScanHistoryEntry> GetAllEntries()
        {
            lock (_lock)
            {
                return new Dictionary<string, ScanHistoryEntry>(_history.Items);
            }
        }
    }

    #endregion

    #region Scheduled Task

    public class RatingRefreshTask : IScheduledTask
    {
        private readonly ILibraryManager _libraryManager;
        private readonly ILogger _logger;
        private readonly IJsonSerializer _jsonSerializer;

        private static readonly object _imdbEpisodeCacheLock = new object();
        private static readonly Dictionary<string, Dictionary<int, string>> _imdbEpisodeIdCache = new Dictionary<string, Dictionary<int, string>>();

        /// <summary>
        /// api.imdbapi.dev requires a tt-prefixed tconst; bare digits return HTTP 400.
        /// Also accepts full imdb.com URLs sometimes stored in provider ids.
        /// </summary>
        private static string NormalizeImdbTconst(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return null;
            var s = raw.Trim();
            var m = System.Text.RegularExpressions.Regex.Match(
                s,
                @"\b(tt\d{7,10})\b",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (m.Success)
                return m.Groups[1].Value;
            if (System.Text.RegularExpressions.Regex.IsMatch(s, @"^\d{7,10}$"))
                return "tt" + s;
            return null;
        }

        public RatingRefreshTask(ILibraryManager libraryManager, ILogManager logManager, IJsonSerializer jsonSerializer)
        {
            _libraryManager = libraryManager;
            _logger = logManager.GetLogger(GetType().Name);
            _jsonSerializer = jsonSerializer;
        }

        public string Name => "Refresh IMDb and Rotten Tomatoes Ratings";

        public string Description => "Updates community ratings from IMDb and critic ratings from Rotten Tomatoes";

        public string Category => "Library";

        public string Key => "RatingSync";

        private void Log(string message, string type = "info")
        {
            switch (type)
            {
                case "error":
                    _logger.Error(message);
                    break;
                case "warning":
                    _logger.Warn(message);
                    break;
                case "success":
                case "info":
                default:
                    _logger.Info(message);
                    break;
            }
        }

        public async Task Execute(CancellationToken cancellationToken, IProgress<double> progress)
        {
            Log("Starting rating refresh task...", "info");

            var config = Plugin.Instance.Configuration;

            if (string.IsNullOrEmpty(config.OmdbApiKey) && string.IsNullOrEmpty(config.MdbListApiKey))
            {
                Log("No API keys configured. Please configure at least one API key in plugin settings.", "error");
                return;
            }

            // Check daily API limits for each API
            var omdbRequests = ScanHistoryManager.GetTodayRequestCount("omdb");
            var mdblistRequests = ScanHistoryManager.GetTodayRequestCount("mdblist");
            var omdbLimitReached = config.OmdbRateLimitEnabled && omdbRequests >= config.OmdbDailyLimit;
            var mdblistLimitReached = config.MdbListRateLimitEnabled && mdblistRequests >= config.MdbListDailyLimit;
            
            // Log current API usage
            if (config.OmdbRateLimitEnabled && !string.IsNullOrEmpty(config.OmdbApiKey))
            {
                Log($"OMDb: {omdbRequests}/{config.OmdbDailyLimit} requests used today{(omdbLimitReached ? " (LIMIT REACHED)" : "")}", omdbLimitReached ? "warning" : "info");
            }
            if (config.MdbListRateLimitEnabled && !string.IsNullOrEmpty(config.MdbListApiKey))
            {
                Log($"MDBList: {mdblistRequests}/{config.MdbListDailyLimit} requests used today{(mdblistLimitReached ? " (LIMIT REACHED)" : "")}", mdblistLimitReached ? "warning" : "info");
            }
            
            // Check if all APIs are at their limit
            var hasOmdb = !string.IsNullOrEmpty(config.OmdbApiKey) && !omdbLimitReached;
            var hasMdbList = !string.IsNullOrEmpty(config.MdbListApiKey) && !mdblistLimitReached;
            
            if (!hasOmdb && !hasMdbList)
            {
                Log("All configured APIs have reached their daily limits. Task will resume tomorrow.", "warning");
                return;
            }

            // Declare these outside try block for catch access
            ScanSession scanSession = null;
            var updatedNames = new List<string>();
            int updated = 0;
            int skipped = 0;
            int errors = 0;
            int processed = 0;
            int omdbCalls = 0;
            int mdblistCalls = 0;
            int imdbScrapeCalls = 0;
            bool wasCancelled = false;

            try
            {
                List<BaseItem> items;
                bool isSelectedScan = SelectedItemsStore.HasItems;
                
                if (isSelectedScan)
                {
                    // Use pre-selected items
                    items = SelectedItemsStore.GetAndClearItems();
                    Log($"Running targeted scan on {items.Count} selected items", "info");
                }
                else
                {
                    // Build list of item types based on configuration
                    var itemTypes = new List<string>();
                    if (config.UpdateMovies) itemTypes.Add("Movie");
                    if (config.UpdateSeries) itemTypes.Add("Series");
                    if (config.UpdateEpisodes) itemTypes.Add("Episode");

                    if (itemTypes.Count == 0)
                    {
                        Log("No item types selected. Please enable at least one item type in settings.", "error");
                        return;
                    }

                    Log($"Processing item types: {string.Join(", ", itemTypes)}", "info");

                    items = _libraryManager.GetItemList(new InternalItemsQuery
                    {
                        IncludeItemTypes = itemTypes.ToArray(),
                        Recursive = true
                    }).Where(i => 
                    {
                        // Include items with direct IMDb ID
                        if (i.HasProviderId(MetadataProviders.Imdb))
                            return true;
                        
                        // Include episodes where parent series has IMDb ID
                        if (config.UpdateEpisodes && i is Episode episode)
                        {
                            // Skip Specials / Season 0
                            if ((episode.ParentIndexNumber ?? 0) == 0)
                                return false;
                            var series = episode.Series;
                            return series != null && series.HasProviderId(MetadataProviders.Imdb);
                        }
                        
                        return false;
                    }).ToList();

                    // Never process Specials / Season 0 episodes
                    if (config.UpdateEpisodes)
                    {
                        items = items.Where(i => !(i is Episode ep && (ep.ParentIndexNumber ?? 0) == 0)).ToList();
                    }

                    // Log breakdown by type
                    var movieCount = items.Count(i => i is Movie);
                    var seriesCount = items.Count(i => i is MediaBrowser.Controller.Entities.TV.Series);
                    var episodeCount = items.Count(i => i is Episode);
                    Log($"Found {items.Count} items: {movieCount} movies, {seriesCount} series, {episodeCount} episodes", "info");

                    // Apply smart scanning filters (only for full scans, not selected items)
                    var originalCount = items.Count;
                    var rescanCutoff = DateTime.UtcNow.AddDays(-config.RescanIntervalDays);
                    var recentlyAddedCutoff = DateTime.UtcNow.AddDays(-config.RecentlyAddedDays);
                    int skippedByHistory = 0;
                    int skippedHasRating = 0;

                    items = items.Where(i =>
                    {
                        var itemId = i.InternalId.ToString();
                        var historyEntry = ScanHistoryManager.GetEntry(itemId);
                        
                        // Skip if scanned recently (within rescan interval)
                        if (historyEntry != null && historyEntry.LastScanned > rescanCutoff)
                        {
                            skippedByHistory++;
                            return false;
                        }
                        
                        // Optionally skip items that already have ratings
                        if (config.SkipUnratedOnly && i.CommunityRating.HasValue)
                        {
                            skippedHasRating++;
                            return false;
                        }
                        
                        return true;
                    }).ToList();

                    if (skippedByHistory > 0 || skippedHasRating > 0)
                    {
                        Log($"Smart scan: Skipped {skippedByHistory} recently scanned, {skippedHasRating} already rated", "info");
                    }
                    Log($"Items to process after filtering: {items.Count} (of {originalCount} total)", "info");

                    // Prioritize recently added content
                    if (config.PrioritizeRecentlyAdded)
                    {
                        var recentItems = items.Where(i => i.DateCreated > recentlyAddedCutoff).ToList();
                        var olderItems = items.Where(i => i.DateCreated <= recentlyAddedCutoff).ToList();
                        
                        if (recentItems.Any())
                        {
                            Log($"Prioritizing {recentItems.Count} recently added items (last {config.RecentlyAddedDays} days)", "info");
                            items = recentItems.Concat(olderItems).ToList();
                        }
                    }

                    // Test mode: only process first item
                    if (config.TestMode && items.Count > 0)
                    {
                        items = new List<BaseItem> { items[0] };
                        Log($"TEST MODE: Processing only first item", "warning");
                    }
                }

                // Safety: never process Specials / Season 0 episodes (also applies to selected scans)
                items = items.Where(i => !(i is Episode ep && (ep.ParentIndexNumber ?? 0) == 0)).ToList();

                ProgressTracker.Start(items.Count);
                scanSession = ScanHistoryManager.StartSession(items.Count);

                foreach (var item in items)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        Log("Task cancelled by user", "warning");
                        wasCancelled = true;
                        break;
                    }

                    // Re-check API limits dynamically
                    var currentOmdbLimitReached = config.OmdbRateLimitEnabled && (omdbRequests + omdbCalls) >= config.OmdbDailyLimit;
                    var currentMdbListLimitReached = config.MdbListRateLimitEnabled && (mdblistRequests + mdblistCalls) >= config.MdbListDailyLimit;
                    var currentHasOmdb = !string.IsNullOrEmpty(config.OmdbApiKey) && !currentOmdbLimitReached;
                    var currentHasMdbList = !string.IsNullOrEmpty(config.MdbListApiKey) && !currentMdbListLimitReached;
                    
                    if (!currentHasOmdb && !currentHasMdbList)
                    {
                        Log("All APIs have reached their daily limits. Stopping for today.", "warning");
                        break;
                    }

                    var itemName = $"{item.Name}";
                    var itemId = item.InternalId.ToString();
                    var imdbId = item.GetProviderId(MetadataProviders.Imdb);
                    EpisodeInfo episodeInfo = null;
                    
                    // Handle episodes - get series IMDb ID and season/episode numbers
                    if (item is Episode episode)
                    {
                        var series = episode.Series;
                        if (series != null)
                        {
                            var seriesImdbId = series.GetProviderId(MetadataProviders.Imdb);
                            if (!string.IsNullOrEmpty(seriesImdbId))
                            {
                                episodeInfo = new EpisodeInfo
                                {
                                    SeriesImdbId = seriesImdbId,
                                    SeasonNumber = episode.ParentIndexNumber ?? 0,
                                    EpisodeNumber = episode.IndexNumber ?? 0,
                                    SeriesName = series.Name
                                };
                                itemName = $"{series.Name} S{episodeInfo.SeasonNumber:D2}E{episodeInfo.EpisodeNumber:D2} - {item.Name}";
                            }
                        }
                        
                        if (episodeInfo == null || episodeInfo.SeasonNumber == 0 || episodeInfo.EpisodeNumber == 0)
                        {
                            skipped++;
                            processed++;
                            ProgressTracker.AddSkipped(item.Name, "Skipped episode, missing season or episode index in library metadata");
                            Log($"⊘ Skipped '{item.Name}' — missing season/episode index", "skip");
                            ProgressTracker.UpdateProgress(processed, updated, skipped, errors, itemName);
                            continue;
                        }
                    }
                    
                    ProgressTracker.UpdateProgress(processed, updated, skipped, errors, itemName);

                    try
                    {
                        var logImdbId = !string.IsNullOrWhiteSpace(imdbId)
                            ? imdbId
                            : (episodeInfo != null ? episodeInfo.SeriesImdbId : "");
                        Log($"Processing: {itemName} ({logImdbId})", "info");
                        
                        var ratings = await FetchRatings(imdbId, config, episodeInfo, currentHasOmdb, currentHasMdbList);
                        
                        // Track API calls
                        if (ratings.UsedOmdb)
                        {
                            omdbCalls++;
                            ScanHistoryManager.IncrementRequestCount("omdb");
                        }
                        if (ratings.UsedMdbList)
                        {
                            mdblistCalls++;
                            ScanHistoryManager.IncrementRequestCount("mdblist");
                        }
                        if (ratings.ImdbScrapeAttempted)
                        {
                            imdbScrapeCalls++;
                            ScanHistoryManager.IncrementImdbScrapeCount();
                        }

                        // Determine source label for display (UI + scan history)
                        string sourceLabel;
                        if (ratings.UsedImdbApiDev && ratings.UsedScraping)
                            sourceLabel = "IMDb unofficial API + imdb.com fallback";
                        else if (ratings.UsedImdbApiDev)
                            sourceLabel = "IMDb unofficial API";
                        else if (ratings.UsedScraping)
                            sourceLabel = "imdb.com fallback";
                        else if (ratings.UsedOmdb && ratings.UsedMdbList)
                            sourceLabel = "OMDb+MDB";
                        else if (ratings.UsedOmdb)
                            sourceLabel = "OMDb";
                        else if (ratings.UsedMdbList)
                            sourceLabel = "MDBList";
                        else
                            sourceLabel = "API";

                        bool itemUpdated = false;
                        var changes = new List<string>();

                        if (ratings.CommunityRating.HasValue)
                        {
                            var oldRating = item.CommunityRating;
                            if (oldRating != ratings.CommunityRating.Value)
                            {
                                item.CommunityRating = ratings.CommunityRating.Value;
                                itemUpdated = true;
                                changes.Add($"IMDb community {(oldRating.HasValue ? oldRating.Value.ToString("F1") : "none")} → {ratings.CommunityRating.Value:F1} ({sourceLabel})");
                            }
                        }

                        if (config.UpdateCriticRating && ratings.CriticRating.HasValue)
                        {
                            var oldCriticRating = item.CriticRating;
                            if (oldCriticRating != ratings.CriticRating.Value)
                            {
                                item.CriticRating = ratings.CriticRating.Value;
                                itemUpdated = true;
                                // RT usually comes from MDBList when using both
                                var rtSource = ratings.UsedMdbList ? "MDBList" : sourceLabel;
                                changes.Add($"RT critic {(oldCriticRating.HasValue ? oldCriticRating.Value.ToString("F0") + "%" : "none")} → {ratings.CriticRating.Value:F0}% ({rtSource})");
                            }
                        }

                        // Record in scan history with detailed info
                        var changeDetails = string.Join(", ", changes);
                        ScanHistoryManager.UpdateItemEntry(itemId, item.CommunityRating, item.CriticRating, itemUpdated ? changeDetails : null);

                        if (itemUpdated)
                        {
                            _libraryManager.UpdateItem(item, item.GetParent(), ItemUpdateType.MetadataEdit);
                            updated++;
                            updatedNames.Add(itemName);
                            ProgressTracker.AddUpdated(itemName, changeDetails);
                            Log($"✓ Updated '{itemName}': {changeDetails}", "success");
                        }
                        else
                        {
                            skipped++;
                            var skipReason = BuildSkippedItemSummary(
                                ratings,
                                config,
                                episodeInfo,
                                currentHasOmdb,
                                currentHasMdbList,
                                item.CommunityRating,
                                item.CriticRating);
                            ProgressTracker.AddSkipped(itemName, skipReason);
                            Log($"⊘ Skipped '{itemName}' — {skipReason}", "skip");
                        }

                        processed++;
                        ProgressTracker.UpdateProgress(processed, updated, skipped, errors, itemName);
                        progress.Report((double)processed / items.Count * 100);

                        // Save scan history periodically (every 10 items)
                        if (processed % 10 == 0)
                        {
                            ScanHistoryManager.Save();
                        }

                        // Rate limit to avoid overwhelming APIs
                        await Task.Delay(1000, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        errors++;
                        processed++;
                        ProgressTracker.AddFailure(itemName, ex.Message);
                        Log($"✗ Error processing '{itemName}': {ex.Message}", "error");
                        ProgressTracker.UpdateProgress(processed, updated, skipped, errors, itemName);
                    }
                }

                // Save scan session (include report samples)
                var progressSnapshot = ProgressTracker.GetProgress();
                ScanHistoryManager.EndSession(
                    scanSession,
                    processed,
                    updated,
                    skipped,
                    errors,
                    wasCancelled,
                    omdbCalls,
                    mdblistCalls,
                    imdbScrapeCalls,
                    updatedNames,
                    progressSnapshot.UpdatedDetails,
                    progressSnapshot.SkippedDetails,
                    progressSnapshot.FailureDetails);

                // Persist full report to a separate file (no sampling)
                ScanHistoryManager.SaveReport(scanSession,
                    progressSnapshot.UpdatedDetails,
                    progressSnapshot.SkippedDetails,
                    progressSnapshot.FailureDetails);
                
                // Save final scan history
                ScanHistoryManager.Save();
                ScanHistoryManager.CleanupOldEntries(90); // Keep 90 days of history
                ScanHistoryManager.CleanupOldReports(20);
                ScanHistoryManager.Save();
                
                ProgressTracker.Stop();
                
                // Build API usage summary
                var apiUsage = new List<string>();
                if (!string.IsNullOrEmpty(config.OmdbApiKey))
                {
                    var omdbTotal = omdbRequests + omdbCalls;
                    apiUsage.Add($"OMDb: {omdbTotal}{(config.OmdbRateLimitEnabled ? "/" + config.OmdbDailyLimit : "")}");
                }
                if (!string.IsNullOrEmpty(config.MdbListApiKey))
                {
                    var mdblistTotal = mdblistRequests + mdblistCalls;
                    apiUsage.Add($"MDBList: {mdblistTotal}{(config.MdbListRateLimitEnabled ? "/" + config.MdbListDailyLimit : "")}");
                }
                var apiInfo = apiUsage.Count > 0 ? $" | API calls: {string.Join(", ", apiUsage)}" : "";
                
                Log($"Rating refresh completed! Processed: {processed}, Updated: {updated}, Skipped: {skipped}, Errors: {errors}{apiInfo}", "success");
            }
            catch (Exception ex)
            {
                // End session on error
                if (scanSession != null)
                {
                    var progressSnapshot = ProgressTracker.GetProgress();
                    ScanHistoryManager.EndSession(
                        scanSession,
                        progressSnapshot.ProcessedItems,
                        updated,
                        skipped,
                        errors,
                        true,
                        omdbCalls,
                        mdblistCalls,
                        imdbScrapeCalls,
                        updatedNames,
                        progressSnapshot.UpdatedDetails,
                        progressSnapshot.SkippedDetails,
                        progressSnapshot.FailureDetails);

                    ScanHistoryManager.SaveReport(scanSession,
                        progressSnapshot.UpdatedDetails,
                        progressSnapshot.SkippedDetails,
                        progressSnapshot.FailureDetails);
                    ScanHistoryManager.Save();
                }
                
                ProgressTracker.Stop();
                Log($"Fatal error during rating refresh: {ex.Message}", "error");
                _logger.ErrorException("Error during rating refresh", ex);
                throw;
            }
        }

        private async Task<RatingData> FetchRatings(string imdbId, PluginConfiguration config, EpisodeInfo episodeInfo, bool canUseOmdb, bool canUseMdbList)
        {
            var result = new RatingData();

            // Episodes only work with OMDb (MDBList doesn't support episode lookups)
            if (episodeInfo != null)
            {
                if (canUseOmdb && !string.IsNullOrEmpty(config.OmdbApiKey))
                {
                    var omdbData = await FetchFromOmdb(imdbId, config.OmdbApiKey, episodeInfo);
                    result.CommunityRating = omdbData.CommunityRating;
                    result.CriticRating = omdbData.CriticRating;
                    result.UsedOmdb = true;
                }
                
                // Fallback: use api.imdbapi.dev (unofficial IMDb API, no key required) if enabled and no rating found.
                // This bypasses the AWS WAF that now blocks direct IMDb scraping.
                if (!result.CommunityRating.HasValue && config.EnableImdbScraping)
                {
                    result.ImdbScrapeAttempted = true;
                    float? apiRating = null;

                    if (!string.IsNullOrWhiteSpace(imdbId))
                    {
                        // Prefer querying the episode's own tt-id directly.
                        result.AttemptedImdbApiDev = true;
                        apiRating = await FetchImdbApiDevRating(imdbId);
                    }

                    if (!apiRating.HasValue && !string.IsNullOrWhiteSpace(episodeInfo.SeriesImdbId))
                    {
                        result.AttemptedImdbApiDev = true;
                        // Fall back to the season list endpoint to find this episode.
                        apiRating = await FetchImdbApiDevEpisodeRating(
                            episodeInfo.SeriesImdbId,
                            episodeInfo.SeasonNumber,
                            episodeInfo.EpisodeNumber,
                            NormalizeImdbTconst(imdbId));
                    }

                    if (apiRating.HasValue)
                    {
                        result.CommunityRating = apiRating;
                        result.UsedImdbApiDev = true;
                    }
                    else
                    {
                        // Last resort: try direct HTML scraping (may be blocked by WAF).
                        result.AttemptedHtmlScrape = true;
                        float? scrapedRating = null;
                        if (!string.IsNullOrWhiteSpace(imdbId))
                            scrapedRating = await ScrapeImdbRating(imdbId);
                        else
                            scrapedRating = await ScrapeImdbEpisodeRating(episodeInfo);

                        if (scrapedRating.HasValue)
                        {
                            result.CommunityRating = scrapedRating;
                            result.UsedScraping = true;
                        }
                    }
                }
                return result;
            }

            switch (config.PreferredSource)
            {
                case RatingSource.OMDb:
                    if (canUseOmdb && !string.IsNullOrEmpty(config.OmdbApiKey))
                    {
                        var omdbData = await FetchFromOmdb(imdbId, config.OmdbApiKey, episodeInfo);
                        result.CommunityRating = omdbData.CommunityRating;
                        result.CriticRating = omdbData.CriticRating;
                        result.UsedOmdb = true;
                    }
                    
                    // Fallback to MDBList if missing community rating OR missing critic rating (when critic updates enabled)
                    var needsMdbFallback = !result.CommunityRating.HasValue || 
                                           (config.UpdateCriticRating && !result.CriticRating.HasValue);
                    if (needsMdbFallback && canUseMdbList && !string.IsNullOrEmpty(config.MdbListApiKey))
                    {
                        var mdbData = await FetchFromMdbList(imdbId, config.MdbListApiKey, episodeInfo);
                        if (!result.CommunityRating.HasValue && mdbData.CommunityRating.HasValue)
                            result.CommunityRating = mdbData.CommunityRating;
                        if (!result.CriticRating.HasValue && mdbData.CriticRating.HasValue)
                            result.CriticRating = mdbData.CriticRating;
                        result.UsedMdbList = true;
                    }
                    break;

                case RatingSource.MDBList:
                    if (canUseMdbList && !string.IsNullOrEmpty(config.MdbListApiKey))
                    {
                        var mdbData = await FetchFromMdbList(imdbId, config.MdbListApiKey, episodeInfo);
                        result.CommunityRating = mdbData.CommunityRating;
                        result.CriticRating = mdbData.CriticRating;
                        result.UsedMdbList = true;
                    }
                    
                    // Fallback to OMDb if missing community rating OR missing critic rating (when critic updates enabled)
                    var needsOmdbFallback = !result.CommunityRating.HasValue || 
                                            (config.UpdateCriticRating && !result.CriticRating.HasValue);
                    if (needsOmdbFallback && canUseOmdb && !string.IsNullOrEmpty(config.OmdbApiKey))
                    {
                        var omdbData = await FetchFromOmdb(imdbId, config.OmdbApiKey, episodeInfo);
                        if (!result.CommunityRating.HasValue && omdbData.CommunityRating.HasValue)
                            result.CommunityRating = omdbData.CommunityRating;
                        if (!result.CriticRating.HasValue && omdbData.CriticRating.HasValue)
                            result.CriticRating = omdbData.CriticRating;
                        result.UsedOmdb = true;
                    }
                    break;

                case RatingSource.Both:
                    // Query both APIs - OMDb first, then MDBList for any missing data
                    if (canUseOmdb && !string.IsNullOrEmpty(config.OmdbApiKey))
                    {
                        var omdbData = await FetchFromOmdb(imdbId, config.OmdbApiKey, episodeInfo);
                        result.CommunityRating = omdbData.CommunityRating;
                        result.CriticRating = omdbData.CriticRating;
                        result.UsedOmdb = true;
                    }
                    
                    // Only call MDBList if we're missing data
                    if ((!result.CommunityRating.HasValue || !result.CriticRating.HasValue) && canUseMdbList && !string.IsNullOrEmpty(config.MdbListApiKey))
                    {
                        var mdbData = await FetchFromMdbList(imdbId, config.MdbListApiKey, episodeInfo);
                        if (!result.CommunityRating.HasValue && mdbData.CommunityRating.HasValue)
                            result.CommunityRating = mdbData.CommunityRating;
                        if (!result.CriticRating.HasValue && mdbData.CriticRating.HasValue)
                            result.CriticRating = mdbData.CriticRating;
                        result.UsedMdbList = true;
                    }
                    break;
            }

            // Fallback for movies/series: use api.imdbapi.dev if scraping is enabled
            // and the configured sources still haven't returned a community rating.
            if (!result.CommunityRating.HasValue && config.EnableImdbScraping && !string.IsNullOrWhiteSpace(imdbId))
            {
                result.AttemptedImdbApiDev = true;
                var apiRating = await FetchImdbApiDevRating(imdbId);
                if (apiRating.HasValue)
                {
                    result.CommunityRating = apiRating;
                    result.UsedImdbApiDev = true;
                }
                else
                {
                    // Last resort: direct HTML scrape (may be blocked by WAF).
                    result.AttemptedHtmlScrape = true;
                    var scrapedRating = await ScrapeImdbRating(imdbId);
                    if (scrapedRating.HasValue)
                    {
                        result.CommunityRating = scrapedRating;
                        result.UsedScraping = true;
                    }
                }
            }

            return result;
        }

        /// <summary>
        /// Short list of which backends were actually queried (for skip / log messages).
        /// </summary>
        private static string DescribeConsultedSources(
            RatingData r,
            PluginConfiguration config,
            EpisodeInfo episodeInfo,
            bool canUseOmdb,
            bool canUseMdbList)
        {
            var parts = new List<string>();
            if (episodeInfo != null)
            {
                if (canUseOmdb && !string.IsNullOrEmpty(config.OmdbApiKey))
                    parts.Add("OMDb");
                if (r.ImdbScrapeAttempted)
                {
                    if (r.AttemptedImdbApiDev)
                        parts.Add("IMDb unofficial API (imdbapi.dev)");
                    if (r.AttemptedHtmlScrape)
                        parts.Add("imdb.com (last resort)");
                }
                else if (!config.EnableImdbScraping)
                    parts.Add("IMDb unofficial API disabled in plugin settings");
            }
            else
            {
                if (r.UsedOmdb)
                    parts.Add("OMDb");
                if (r.UsedMdbList)
                    parts.Add("MDBList");
                if (r.AttemptedImdbApiDev)
                    parts.Add("IMDb unofficial API (imdbapi.dev)");
                if (r.AttemptedHtmlScrape)
                    parts.Add("imdb.com (last resort)");
                if (parts.Count == 0)
                    parts.Add("no sources ran (missing API keys, limits, or IMDb id)");
            }

            return string.Join(", ", parts);
        }

        /// <summary>
        /// User-facing explanation when an item was not updated (library vs API outcome).
        /// </summary>
        private static string BuildSkippedItemSummary(
            RatingData ratings,
            PluginConfiguration config,
            EpisodeInfo episodeInfo,
            bool canUseOmdb,
            bool canUseMdbList,
            float? libraryCommunity,
            float? libraryCritic)
        {
            var consulted = DescribeConsultedSources(ratings, config, episodeInfo, canUseOmdb, canUseMdbList);
            var wantsRt = config.UpdateCriticRating;
            var apiImdb = ratings.CommunityRating;
            var apiRt = ratings.CriticRating;
            var hasAnyApi = apiImdb.HasValue || apiRt.HasValue;

            if (!hasAnyApi)
            {
                if (episodeInfo != null && !config.EnableImdbScraping && (!canUseOmdb || string.IsNullOrEmpty(config.OmdbApiKey)))
                    return $"No scores available, consulted {consulted}. Add an OMDb key or enable IMDb unofficial API for episode IMDb ratings.";

                return $"No scores available, consulted {consulted}. Sources returned no usable IMDb or RT data for this item (new or unrated episodes are common).";
            }

            var segments = new List<string>();
            if (apiImdb.HasValue && libraryCommunity.HasValue && Math.Abs(apiImdb.Value - libraryCommunity.Value) < 0.001f)
                segments.Add($"IMDb community already matches library ({libraryCommunity.Value:F1})");
            else if (!apiImdb.HasValue)
                segments.Add("IMDb community score not returned by consulted sources");

            if (wantsRt)
            {
                if (apiRt.HasValue && libraryCritic.HasValue && Math.Abs(apiRt.Value - libraryCritic.Value) < 0.001f)
                    segments.Add($"RT critic already matches library ({libraryCritic.Value:F0}%)");
                else if (!apiRt.HasValue)
                    segments.Add("RT critic score not returned by consulted sources");
            }

            if (segments.Count == 0)
                return "No changes needed, consulted " + consulted;

            return "Already up to date, " + string.Join("; ", segments);
        }

        private async Task<RatingData> FetchFromOmdb(string imdbId, string apiKey, EpisodeInfo episodeInfo = null)
        {
            var result = new RatingData();
            
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(15);
                    
                    string url;
                    if (episodeInfo != null)
                    {
                        // If Emby has the episode's own IMDb ID, query it directly — this gives
                        // OMDb the best chance of returning up-to-date data for recent episodes.
                        if (!string.IsNullOrWhiteSpace(imdbId))
                            url = $"http://www.omdbapi.com/?i={imdbId}&apikey={apiKey}";
                        else
                            url = $"http://www.omdbapi.com/?i={episodeInfo.SeriesImdbId}&Season={episodeInfo.SeasonNumber}&Episode={episodeInfo.EpisodeNumber}&apikey={apiKey}";
                    }
                    else
                    {
                        url = $"http://www.omdbapi.com/?i={imdbId}&apikey={apiKey}";
                    }
                    
                    var response = await client.GetAsync(url);
                    var responseBody = await response.Content.ReadAsStringAsync();
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        return result;
                    }
                    
                    var data = _jsonSerializer.DeserializeFromString<OmdbResponse>(responseBody);

                    if (data != null && data.Response == "True")
                    {
                        // IMDb Rating
                        if (!string.IsNullOrEmpty(data.imdbRating) && data.imdbRating != "N/A")
                        {
                            if (float.TryParse(data.imdbRating, System.Globalization.NumberStyles.Float,
                                System.Globalization.CultureInfo.InvariantCulture, out var rating))
                            {
                                result.CommunityRating = rating;
                            }
                        }

                        // Rotten Tomatoes Rating
                        if (data.Ratings != null)
                        {
                            var rtRating = data.Ratings.FirstOrDefault(r => r.Source == "Rotten Tomatoes");
                            if (rtRating != null && !string.IsNullOrEmpty(rtRating.Value))
                            {
                                var percentStr = rtRating.Value.Replace("%", "");
                                if (float.TryParse(percentStr, System.Globalization.NumberStyles.Float,
                                    System.Globalization.CultureInfo.InvariantCulture, out var rtScore))
                                {
                                    result.CriticRating = rtScore;
                                }
                            }
                        }
                    }

                }
            }
            catch (TaskCanceledException)
            {
                // Timeout - ignore
            }
            catch (Exception)
            {
                // API error - ignore
            }

            return result;
        }

        private async Task<RatingData> FetchFromMdbList(string imdbId, string apiKey, EpisodeInfo episodeInfo = null)
        {
            var result = new RatingData();
            
            // MDBList doesn't support episode-specific lookups - skip for episodes
            if (episodeInfo != null)
            {
                return result;
            }
            
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(15);
                    
                    // MDBList API format: https://api.mdblist.com/{provider}/{type}/{id}?apikey={key}
                    // Try as show first for series, then movie
                    var url = $"https://api.mdblist.com/imdb/show/{imdbId}?apikey={apiKey}";
                    
                    HttpResponseMessage response;
                    string responseBody;
                    
                    try
                    {
                        response = await client.GetAsync(url);
                        responseBody = await response.Content.ReadAsStringAsync();
                        
                        // If show lookup fails or returns no data, try as movie
                        if (!response.IsSuccessStatusCode || string.IsNullOrEmpty(responseBody) || responseBody.Contains("\"ratings\":null"))
                        {
                            url = $"https://api.mdblist.com/imdb/movie/{imdbId}?apikey={apiKey}";
                            response = await client.GetAsync(url);
                            responseBody = await response.Content.ReadAsStringAsync();
                        }
                    }
                    catch (HttpRequestException)
                    {
                        return result;
                    }
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        return result;
                    }
                    
                    var data = _jsonSerializer.DeserializeFromString<MdbListResponse>(responseBody);

                    if (data != null && data.ratings != null && data.ratings.Count > 0)
                    {
                        // Find IMDb rating in the ratings array
                        var imdbRating = data.ratings.FirstOrDefault(r => r.source == "imdb");
                        if (imdbRating != null && imdbRating.value.HasValue && imdbRating.value.Value > 0)
                        {
                            result.CommunityRating = imdbRating.value.Value;
                        }
                        else if (data.score.HasValue && data.score.Value > 0)
                        {
                            // Use MDBList score as fallback (normalized 0-100, convert to 0-10)
                            result.CommunityRating = data.score.Value / 10f;
                        }

                        // Find Rotten Tomatoes rating in the ratings array
                        var rtRating = data.ratings.FirstOrDefault(r => r.source == "tomatoes");
                        if (rtRating != null && rtRating.value.HasValue && rtRating.value.Value > 0)
                        {
                            result.CriticRating = rtRating.value.Value;
                        }
                    }
                }
            }
            catch (Exception)
            {
                // API error - ignore
            }

            return result;
        }

        // Fetch the IMDb rating for any title (episode, movie, series) via api.imdbapi.dev.
        // This unofficial API mirrors live IMDb data and is not subject to the AWS WAF
        // that now blocks direct imdb.com requests.
        private async Task<float?> FetchImdbApiDevRating(string imdbId)
        {
            try
            {
                imdbId = NormalizeImdbTconst(imdbId);
                if (string.IsNullOrWhiteSpace(imdbId))
                    return null;

                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(10);
                    client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
                    var url = $"https://api.imdbapi.dev/titles/{imdbId}";
                    var response = await client.GetAsync(url);
                    if (!response.IsSuccessStatusCode)
                        return null;

                    var body = await response.Content.ReadAsStringAsync();
                    var data = _jsonSerializer.DeserializeFromString<ImdbApiDevTitleResponse>(body);
                    if (data?.rating?.aggregateRating.HasValue == true && data.rating.aggregateRating.Value >= 1)
                        return data.rating.aggregateRating.Value;
                }
            }
            catch { }
            return null;
        }

        // Fetch an episode's IMDb rating via the season-episode list endpoint on api.imdbapi.dev.
        // Used when Emby doesn't supply an episode-level IMDb ID, or when the direct title lookup had no rating.
        // alreadyTriedEpisodeTconst: avoid a redundant GET when FetchRatings already called FetchImdbApiDevRating(imdbId).
        private async Task<float?> FetchImdbApiDevEpisodeRating(
            string seriesImdbId,
            int seasonNumber,
            int episodeNumber,
            string alreadyTriedEpisodeTconst = null)
        {
            try
            {
                seriesImdbId = NormalizeImdbTconst(seriesImdbId);
                if (string.IsNullOrWhiteSpace(seriesImdbId) || seasonNumber <= 0 || episodeNumber <= 0)
                    return null;

                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(10);
                    client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
                    // Use ?season= (not seasonNumber=): the latter can match multiple seasons on the API.
                    var url = $"https://api.imdbapi.dev/titles/{seriesImdbId}/episodes?season={seasonNumber}";
                    var response = await client.GetAsync(url);
                    if (!response.IsSuccessStatusCode)
                        return null;

                    var body = await response.Content.ReadAsStringAsync();
                    var data = _jsonSerializer.DeserializeFromString<ImdbApiDevEpisodesResponse>(body);
                    // If the API returns duplicate episode indices, prefer the row with more votes.
                    // (Some seasons include extras without episodeNumber; those never match here.)
                    var ep = data?.episodes?
                        .Where(e => e.episodeNumber == episodeNumber)
                        .OrderByDescending(e => e.rating?.voteCount ?? 0)
                        .FirstOrDefault();
                    if (ep?.rating?.aggregateRating.HasValue == true && ep.rating.aggregateRating.Value >= 1)
                        return ep.rating.aggregateRating.Value;
                    // Season list sometimes omits rating while GET /titles/{episodeId} includes it.
                    var epNorm = NormalizeImdbTconst(ep?.id);
                    var triedNorm = NormalizeImdbTconst(alreadyTriedEpisodeTconst);
                    if (!string.IsNullOrWhiteSpace(epNorm)
                        && !string.Equals(epNorm, triedNorm, StringComparison.OrdinalIgnoreCase))
                    {
                        var byEpisodeId = await FetchImdbApiDevRating(ep.id);
                        if (byEpisodeId.HasValue)
                            return byEpisodeId;
                    }
                }
            }
            catch { }
            return null;
        }

        private async Task<float?> ScrapeImdbRating(string imdbId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(imdbId))
                    return null;

                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(10);
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
                    client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
                    client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
                    
                    var url = $"https://www.imdb.com/title/{imdbId}/";
                    var response = await client.GetAsync(url);
                    
                    if (!response.IsSuccessStatusCode)
                        return null;
                    
                    var html = await response.Content.ReadAsStringAsync();

                    // Prefer parsing near the requested tconst to avoid accidentally capturing a parent series rating
                    // that may also be embedded on an episode page.
                    string scopedHtml = html;
                    try
                    {
                        var tconstNeedle = $"\"tconst\":\"{imdbId}\"";
                        var idx = html.IndexOf(tconstNeedle, StringComparison.Ordinal);
                        if (idx >= 0)
                        {
                            var start = Math.Max(0, idx - 2000);
                            var length = Math.Min(html.Length - start, 25000);
                            scopedHtml = html.Substring(start, length);
                        }
                    }
                    catch
                    {
                        scopedHtml = html;
                    }
                    
                    // Pattern 1 (BEST): Look for ratingsSummary with aggregateRating - most reliable for episodes
                    // Format: "ratingsSummary":{"aggregateRating":6.7 or "ratingsSummary":{"topRanking":null,...,"aggregateRating":6.7
                    var match = System.Text.RegularExpressions.Regex.Match(scopedHtml, @"""ratingsSummary""[^}]*""aggregateRating""\s*:\s*([\d.]+)");
                    
                    // Pattern 2: JSON-LD AggregateRating object - "AggregateRating"..."ratingValue":8.5
                    // This is used for movies/shows with full JSON-LD structured data
                    if (!match.Success)
                    {
                        match = System.Text.RegularExpressions.Regex.Match(scopedHtml, @"""AggregateRating""[^}]*""ratingValue""\s*:\s*([\d.]+)");
                    }
                    
                    // Pattern 3: Fallback - aggregateRating as standalone object (not in ratingsSummary)
                    if (!match.Success)
                    {
                        match = System.Text.RegularExpressions.Regex.Match(scopedHtml, @"""aggregateRating""\s*:\s*\{[^}]*""ratingValue""\s*:\s*([\d.]+)");
                    }
                    
                    if (match.Success && float.TryParse(match.Groups[1].Value, 
                        System.Globalization.NumberStyles.Float, 
                        System.Globalization.CultureInfo.InvariantCulture, 
                        out var rating))
                    {
                        // Validate rating is in expected range
                        if (rating >= 1 && rating <= 10)
                        {
                            return rating;
                        }
                    }
                }
            }
            catch (TaskCanceledException)
            {
                // Timeout
            }
            catch (Exception)
            {
                // Scraping error - ignore
            }
            
            return null;
        }

        private async Task<float?> ScrapeImdbEpisodeRating(EpisodeInfo episodeInfo)
        {
            try
            {
                if (episodeInfo == null)
                    return null;
                if (string.IsNullOrWhiteSpace(episodeInfo.SeriesImdbId))
                    return null;
                if (episodeInfo.SeasonNumber <= 0 || episodeInfo.EpisodeNumber <= 0)
                    return null;

                var episodeImdbId = await TryResolveEpisodeImdbIdFromSeriesEpisodesPage(
                    episodeInfo.SeriesImdbId,
                    episodeInfo.SeasonNumber,
                    episodeInfo.EpisodeNumber);

                if (string.IsNullOrWhiteSpace(episodeImdbId))
                    return null;

                // Now scrape the episode title page.
                return await ScrapeImdbRating(episodeImdbId);
            }
            catch
            {
                return null;
            }
        }

        private async Task<string> TryResolveEpisodeImdbIdFromSeriesEpisodesPage(string seriesImdbId, int seasonNumber, int episodeNumber)
        {
            try
            {
                var cacheKey = seriesImdbId + "|S" + seasonNumber;
                lock (_imdbEpisodeCacheLock)
                {
                    if (_imdbEpisodeIdCache.TryGetValue(cacheKey, out var cachedMap)
                        && cachedMap != null
                        && cachedMap.TryGetValue(episodeNumber, out var cachedId)
                        && !string.IsNullOrWhiteSpace(cachedId))
                    {
                        return cachedId;
                    }
                }

                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(10);
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
                    client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
                    client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");

                    var url = $"https://www.imdb.com/title/{seriesImdbId}/episodes?season={seasonNumber}";
                    var response = await client.GetAsync(url);
                    if (!response.IsSuccessStatusCode)
                        return null;

                    var html = await response.Content.ReadAsStringAsync();
                    if (string.IsNullOrWhiteSpace(html))
                        return null;

                    // Parse and cache all episode ids for this season in one pass.
                    // Example link: /title/tt39306204/?ref_=ttep_ep_1
                    var map = new Dictionary<int, string>();
                    var all = System.Text.RegularExpressions.Regex.Matches(
                        html,
                        "href\\s*=\\s*\\\"/title/(?<id>tt\\d{7,8})/\\?ref_=ttep_ep_(?<ep>\\d+)\\b",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    foreach (System.Text.RegularExpressions.Match m in all)
                    {
                        if (!m.Success) continue;
                        if (!int.TryParse(m.Groups["ep"].Value, out var epNum)) continue;
                        var id = m.Groups["id"].Value;
                        if (epNum > 0 && !string.IsNullOrWhiteSpace(id))
                            map[epNum] = id;
                    }

                    if (map.Count > 0)
                    {
                        lock (_imdbEpisodeCacheLock)
                        {
                            if (_imdbEpisodeIdCache.Count > 200)
                                _imdbEpisodeIdCache.Clear();
                            _imdbEpisodeIdCache[cacheKey] = map;
                        }

                        if (map.TryGetValue(episodeNumber, out var found) && !string.IsNullOrWhiteSpace(found))
                            return found;
                    }

                    // Preferred: links contain ref_=ttep_ep_{N} for the episode card.
                    var epRefNeedles = new[] { $"ttep_ep_{episodeNumber}", $"ttep_ep{episodeNumber}" };
                    foreach (var epRefNeedle in epRefNeedles)
                    {
                        var pattern = "href\\s*=\\s*\\\"/title/(?<id>tt\\d{7,8})/\\?ref_="
                            + System.Text.RegularExpressions.Regex.Escape(epRefNeedle)
                            + "[^\\\"]*\\\"";
                        var match = System.Text.RegularExpressions.Regex.Match(
                            html,
                            pattern,
                            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                        if (match.Success)
                            return match.Groups["id"].Value;
                    }

                    // Fallback: sometimes the ref format changes; try finding a title id on the same line/near the episode ref.
                    foreach (var epRefNeedle in epRefNeedles)
                    {
                        var idx = html.IndexOf(epRefNeedle, StringComparison.OrdinalIgnoreCase);
                        if (idx >= 0)
                        {
                            var start = Math.Max(0, idx - 1000);
                            var length = Math.Min(html.Length - start, 3000);
                            var window = html.Substring(start, length);

                            var match = System.Text.RegularExpressions.Regex.Match(
                                window,
                                @"/title/(?<id>tt\d{7,8})/",
                                System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                            if (match.Success)
                                return match.Groups["id"].Value;
                        }
                    }
                }
            }
            catch
            {
                // ignore
            }

            return null;
        }

        public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
        {
            return new[]
            {
                new TaskTriggerInfo
                {
                    Type = TaskTriggerInfo.TriggerDaily,
                    TimeOfDayTicks = TimeSpan.FromHours(3).Ticks
                }
            };
        }

        private class EpisodeInfo
        {
            public string SeriesImdbId { get; set; }
            public string SeriesName { get; set; }
            public int SeasonNumber { get; set; }
            public int EpisodeNumber { get; set; }
        }

        private class RatingData
        {
            public float? CommunityRating { get; set; }
            public float? CriticRating { get; set; }
            public bool UsedOmdb { get; set; }
            public bool UsedMdbList { get; set; }
            /// <summary>True when the score came from a direct imdb.com page request (last resort, not imdbapi.dev).</summary>
            public bool UsedScraping { get; set; }
            public bool UsedImdbApiDev { get; set; }
            public bool AttemptedImdbApiDev { get; set; }
            public bool AttemptedHtmlScrape { get; set; }
            public bool ImdbScrapeAttempted { get; set; }
        }

        private class OmdbResponse
        {
            public string imdbRating { get; set; }
            public string Response { get; set; }
            public string Error { get; set; }
            public List<OmdbRating> Ratings { get; set; }
        }

        private class OmdbRating
        {
            public string Source { get; set; }
            public string Value { get; set; }
        }

        private class ImdbApiDevRating
        {
            public float? aggregateRating { get; set; }
            public int? voteCount { get; set; }
        }

        private class ImdbApiDevTitleResponse
        {
            public string id { get; set; }
            public ImdbApiDevRating rating { get; set; }
        }

        private class ImdbApiDevEpisodesResponse
        {
            public List<ImdbApiDevEpisodeEntry> episodes { get; set; }
        }

        private class ImdbApiDevEpisodeEntry
        {
            public string id { get; set; }
            public int? episodeNumber { get; set; }
            public ImdbApiDevRating rating { get; set; }
        }

        private class MdbListResponse
        {
            public string title { get; set; }
            public int? year { get; set; }
            public int? score { get; set; }
            public int? score_average { get; set; }
            public string type { get; set; }
            public List<MdbListRating> ratings { get; set; }
        }

        private class MdbListRating
        {
            public string source { get; set; }
            public float? value { get; set; }
            public int? score { get; set; }
            public int? votes { get; set; }
        }
    }

    #endregion
}