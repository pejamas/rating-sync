define(['baseView', 'loading', 'toast', 'emby-input', 'emby-button', 'emby-select', 'emby-checkbox'],
function (BaseView, loading, toast) {
    'use strict';

    var pluginId = '12345678-1234-1234-1234-123456789012';

    return class extends BaseView {
        constructor(view, params) {
            super(view, params);
            this.pollInterval = null;
            this.elapsedInterval = null;
            this.startTime = null;
            this.activeResultTab = 'updatedList';
            this.missingDataCache = null;
            this.selectedMissingId = null;
            this.selectedMissingItem = null;
            this.scanHistorySessions = null;
            this._scanReportKeydownBound = false;
        }

        // Tab navigation
        bindTabNavigation(view) {
            var self = this;
            var navButtons = view.querySelectorAll('.localnav .nav-button');
            
            navButtons.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = this.getAttribute('data-target');
                    
                    // Update active button
                    navButtons.forEach(function(b) { b.classList.remove('ui-btn-active'); });
                    this.classList.add('ui-btn-active');
                    
                    // Show target tab
                    view.querySelectorAll('.tabPage').forEach(function(page) {
                        page.classList.remove('active');
                    });
                    var targetPage = view.querySelector('#' + targetId);
                    if (targetPage) {
                        targetPage.classList.add('active');
                    }
                    
                    // Load history when switching to history tab
                    if (targetId === 'historyPage') {
                        self.loadScanHistory(view);
                    }

                    self.updateApiCounters(view);
                });
            });
        }

        updateApiCounters(view) {
            var self = this;
            var primary = view.querySelector('#apiCountersText');
            var nodes = primary ? [primary] : view.querySelectorAll('.apiCountersText');
            if (!nodes || nodes.length === 0) return;

            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/ApiCounters'),
                dataType: 'json'
            }).then(function(data) {
                var text = self.formatApiCounters(data);
                Array.prototype.forEach.call(nodes, function(n) { n.innerHTML = text; });
            }).catch(function() {
                Array.prototype.forEach.call(nodes, function(n) { n.textContent = 'API usage unavailable'; });
            });
        }

        formatApiCounters(data) {
            if (!data) return 'API usage unavailable';

            var today = data.Today ? String(data.Today) : '';
            var todayLabel = '';
            if (today && /^\d{4}-\d{2}-\d{2}$/.test(today)) {
                try {
                    var d = new Date(today + 'T00:00:00');
                    todayLabel = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                    todayLabel = today;
                }
            } else if (today) {
                todayLabel = today;
            }
            var omdbText = 'OMDb: —';
            if (data.OmdbHasKey) {
                omdbText = 'OMDb: ' + (data.OmdbUsed || 0) + (data.OmdbRateLimitEnabled && data.OmdbLimit ? ('/' + data.OmdbLimit) : '');
            }

            var mdbText = 'MDBList: —';
            if (data.MdbListHasKey) {
                mdbText = 'MDBList: ' + (data.MdbListUsed || 0) + (data.MdbListRateLimitEnabled && data.MdbListLimit ? ('/' + data.MdbListLimit) : '');
            }

            var imdbText = 'IMDb API: ' + (data.ImdbScrapesUsed || 0);

            var html = '';
            if (todayLabel) {
                html += '<span style="opacity:0.78;margin-right:0.6em">' + this.escapeHtml('API usage — ' + todayLabel + ' (resets 00:00 UTC)') + '</span>';
            } else if (today) {
                html += '<span style="opacity:0.78;margin-right:0.6em">API usage — today (resets 00:00 UTC)</span>';
            } else {
                html += '<span style="opacity:0.78;margin-right:0.6em">API usage (resets 00:00 UTC)</span>';
            }
            html += '<span class="apiBadge"><span class="apiDot omdb"></span><span>' + this.escapeHtml(omdbText) + '</span></span>';
            html += '<span class="apiBadge"><span class="apiDot mdblist"></span><span>' + this.escapeHtml(mdbText) + '</span></span>';
            html += '<span class="apiBadge"><span class="apiDot imdb"></span><span>' + this.escapeHtml(imdbText) + '</span></span>';
            return html;
        }

        deleteScanBySessionId(view, sessionId) {
            var self = this;
            if (!sessionId) {
                toast('Missing SessionId');
                return;
            }

            if (!confirm('Delete this scan? This cannot be undone.')) {
                return;
            }

            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('RatingSync/DeleteScan'),
                data: JSON.stringify({ SessionId: sessionId }),
                contentType: 'application/json',
                dataType: 'json'
            }).then(function(res) {
                if (res && res.Success) {
                    toast('Scan deleted');
                    if (self.activeScanReportSession && self.activeScanReportSession.SessionId === sessionId) {
                        self.closeScanReport(view);
                        self.activeScanReportSession = null;
                        self.activeScanReport = null;
                    }
                    self.loadScanHistory(view);
                } else {
                    toast((res && res.Message) ? res.Message : 'Failed to delete scan');
                }
            }).catch(function() {
                toast('Failed to delete scan');
            });
        }

        // Result tab navigation
        bindResultTabs(view) {
            var self = this;
            var resultTabs = view.querySelectorAll('.resultTab');
            
            resultTabs.forEach(function(tab) {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    var targetId = this.getAttribute('data-target');
                    self.activeResultTab = targetId;
                    
                    // Update active tab
                    resultTabs.forEach(function(t) { t.classList.remove('active'); });
                    this.classList.add('active');
                    
                    // Show target list
                    view.querySelector('#updatedList').classList.add('hide');
                    view.querySelector('#skippedList').classList.add('hide');
                    view.querySelector('#failureList').classList.add('hide');
                    view.querySelector('#' + targetId).classList.remove('hide');
                });
            });
        }

        // Library selection
        loadLibraries(view) {
            var self = this;
            self.libraryTypes = {}; // Store library types
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Libraries'),
                dataType: 'json'
            }).then(function(libraries) {
                var select = view.querySelector('#selectLibrary');
                select.innerHTML = '<option value="">All Libraries</option>';
                libraries.forEach(function(lib) {
                    var option = document.createElement('option');
                    option.value = lib.Id;
                    option.textContent = lib.Name;
                    option.dataset.type = lib.CollectionType;
                    select.appendChild(option);
                    self.libraryTypes[lib.Id] = lib.CollectionType;
                });
            }).catch(function(err) {
                console.error('Error loading libraries:', err);
            });
        }

        onLibrarySelected(view, libraryId) {
            var self = this;
            var tvSection = view.querySelector('#tvShowSelection');
            var movieSection = view.querySelector('#movieSelection');
            
            // Determine library type
            var libraryType = libraryId ? self.libraryTypes[libraryId] : 'mixed';
            console.log('Library type:', libraryType);
            
            if (libraryType === 'movies') {
                // Show movie selection, hide TV selection
                tvSection.classList.add('hide');
                movieSection.classList.remove('hide');
                self.resetTvSelection(view);
                self.loadMovies(view, libraryId);
            } else if (libraryType === 'tvshows') {
                // Show TV selection, hide movie selection
                tvSection.classList.remove('hide');
                movieSection.classList.add('hide');
                self.resetMovieSelection(view);
                self.loadSeries(view, libraryId);
            } else {
                // Mixed or all - show both
                tvSection.classList.remove('hide');
                movieSection.classList.remove('hide');
                self.loadSeries(view, libraryId);
                self.loadMovies(view, libraryId);
            }

            self.updateAddedWithinVisibility(view);
        }

        updateAddedWithinVisibility(view) {
            var box = view.querySelector('#addedWithinSelection');
            if (!box) return;

            var tvSection = view.querySelector('#tvShowSelection');
            var movieSection = view.querySelector('#movieSelection');
            var seriesSelect = view.querySelector('#selectSeries');
            var movieSelect = view.querySelector('#selectMovie');

            var showForTv = tvSection && !tvSection.classList.contains('hide')
                && seriesSelect && !seriesSelect.disabled
                && (!seriesSelect.value);

            var showForMovies = movieSection && !movieSection.classList.contains('hide')
                && movieSelect && !movieSelect.disabled
                && (!movieSelect.value);

            if (showForTv || showForMovies) box.classList.remove('hide');
            else box.classList.add('hide');
        }

        resetTvSelection(view) {
            var seriesSelect = view.querySelector('#selectSeries');
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            seriesSelect.innerHTML = '<option value="">All Series</option>';
            seriesSelect.disabled = true;
            seasonSelect.innerHTML = '<option value="">All Seasons</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">All Episodes</option>';
            episodeSelect.disabled = true;
        }

        resetMovieSelection(view) {
            var movieSelect = view.querySelector('#selectMovie');
            movieSelect.innerHTML = '<option value="">All Movies</option>';
            movieSelect.disabled = true;
        }

        loadMovies(view, libraryId) {
            var self = this;
            var movieSelect = view.querySelector('#selectMovie');
            
            movieSelect.innerHTML = '<option value="">All Movies</option>';
            movieSelect.disabled = true;
            
            var url = libraryId 
                ? ApiClient.getUrl('RatingSync/Movies', { LibraryId: libraryId })
                : ApiClient.getUrl('RatingSync/Movies');
            
            console.log('Loading movies from:', url);
            
            ApiClient.ajax({
                type: 'GET',
                url: url,
                dataType: 'json'
            }).then(function(movies) {
                console.log('Loaded movies:', movies ? movies.length : 0);
                if (movies && movies.length > 0) {
                    movieSelect.disabled = false;
                    movies.forEach(function(m) {
                        var option = document.createElement('option');
                        option.value = m.Id;
                        option.textContent = m.Name;
                        movieSelect.appendChild(option);
                    });
                }

                self.updateAddedWithinVisibility(view);
            }).catch(function(err) {
                console.error('Error loading movies:', err);
            });
        }

        loadSeries(view, libraryId) {
            var self = this;
            var seriesSelect = view.querySelector('#selectSeries');
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset downstream dropdowns
            seriesSelect.innerHTML = '<option value="">All Series</option>';
            seriesSelect.disabled = true;
            seasonSelect.innerHTML = '<option value="">All Seasons</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">All Episodes</option>';
            episodeSelect.disabled = true;
            
            // Always load series (even without library filter)
            var url = libraryId 
                ? ApiClient.getUrl('RatingSync/Series', { LibraryId: libraryId })
                : ApiClient.getUrl('RatingSync/Series');
            
            console.log('Loading series from:', url);
            
            ApiClient.ajax({
                type: 'GET',
                url: url,
                dataType: 'json'
            }).then(function(series) {
                console.log('Loaded series:', series ? series.length : 0);
                if (series && series.length > 0) {
                    seriesSelect.disabled = false;
                    series.forEach(function(s) {
                        var option = document.createElement('option');
                        option.value = s.Id;
                        option.textContent = s.Name + (s.Year ? ' (' + s.Year + ')' : '');
                        seriesSelect.appendChild(option);
                    });
                }

                self.updateAddedWithinVisibility(view);
            }).catch(function(err) {
                console.error('Error loading series:', err);
            });
        }

        loadSeasons(view, seriesId) {
            var self = this;
            var seasonSelect = view.querySelector('#selectSeason');
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset downstream dropdowns
            seasonSelect.innerHTML = '<option value="">All Seasons</option>';
            seasonSelect.disabled = true;
            episodeSelect.innerHTML = '<option value="">All Episodes</option>';
            episodeSelect.disabled = true;
            
            if (!seriesId) return;
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Seasons', { SeriesId: seriesId }),
                dataType: 'json'
            }).then(function(seasons) {
                if (seasons.length > 0) {
                    seasonSelect.disabled = false;
                    seasons.forEach(function(s) {
                        var option = document.createElement('option');
                        option.value = s.Id;
                        option.textContent = s.Name + ' (' + s.EpisodeCount + ' episodes)';
                        seasonSelect.appendChild(option);
                    });
                }
            }).catch(function(err) {
                console.error('Error loading seasons:', err);
            });
        }

        loadEpisodes(view, seasonId) {
            var self = this;
            var episodeSelect = view.querySelector('#selectEpisode');
            
            // Reset dropdown
            episodeSelect.innerHTML = '<option value="">All Episodes</option>';
            episodeSelect.disabled = true;
            
            if (!seasonId) return;
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Episodes', { SeasonId: seasonId }),
                dataType: 'json'
            }).then(function(episodes) {
                if (episodes.length > 0) {
                    episodeSelect.disabled = false;
                    episodes.forEach(function(e) {
                        var option = document.createElement('option');
                        option.value = e.Id;
                        option.textContent = 'E' + (e.EpisodeNumber || '?') + ' - ' + e.Name;
                        episodeSelect.appendChild(option);
                    });
                }
            }).catch(function(err) {
                console.error('Error loading episodes:', err);
            });
        }

        bindLibrarySelection(view) {
            var self = this;
            
            var selectLibrary = view.querySelector('#selectLibrary');
            var selectSeries = view.querySelector('#selectSeries');
            var selectSeason = view.querySelector('#selectSeason');
            var selectEpisode = view.querySelector('#selectEpisode');
            var selectMovie = view.querySelector('#selectMovie');
            
            // Track last values to prevent duplicate calls
            var lastLibraryValue = '';
            var lastSeriesValue = '';
            var lastSeasonValue = '';
            
            function onLibraryChange() {
                var value = selectLibrary.value;
                if (value === lastLibraryValue) return;
                lastLibraryValue = value;
                lastSeriesValue = '';
                lastSeasonValue = '';
                console.log('Library changed:', value);
                self.onLibrarySelected(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            function onSeriesChange() {
                var value = selectSeries.value;
                if (value === lastSeriesValue) return;
                lastSeriesValue = value;
                lastSeasonValue = '';
                console.log('Series changed:', value);
                self.loadSeasons(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            function onSeasonChange() {
                var value = selectSeason.value;
                if (value === lastSeasonValue) return;
                lastSeasonValue = value;
                console.log('Season changed:', value);
                self.loadEpisodes(view, value);
                self.updateAddedWithinVisibility(view);
            }
            
            selectLibrary.addEventListener('change', onLibraryChange);
            selectSeries.addEventListener('change', onSeriesChange);
            selectSeason.addEventListener('change', onSeasonChange);

            if (selectMovie) {
                selectMovie.addEventListener('change', function() {
                    self.updateAddedWithinVisibility(view);
                });
            }

            if (selectEpisode) {
                selectEpisode.addEventListener('change', function() {
                    self.updateAddedWithinVisibility(view);
                });
            }
        }

        loadConfig(view) {
            loading.show();

            ApiClient.getPluginConfiguration(pluginId).then(function (config) {
                view.querySelector('#txtOmdbApiKey').value = config.OmdbApiKey || '';
                view.querySelector('#txtMdbListApiKey').value = config.MdbListApiKey || '';
                
                // Handle PreferredSource - could be number or string
                var sourceValue = config.PreferredSource;
                if (typeof sourceValue === 'number') {
                    var sourceMap = ['OMDb', 'MDBList', 'Both'];
                    sourceValue = sourceMap[sourceValue] || 'OMDb';
                }
                view.querySelector('#selectPreferredSource').value = sourceValue || 'OMDb';
                
                view.querySelector('#chkUpdateCriticRating').checked = config.UpdateCriticRating !== false;
                view.querySelector('#chkUpdateMovies').checked = config.UpdateMovies !== false;
                view.querySelector('#chkUpdateSeries').checked = config.UpdateSeries !== false;
                view.querySelector('#chkUpdateEpisodes').checked = config.UpdateEpisodes === true;
                view.querySelector('#chkEnableImdbScraping').checked = config.EnableImdbScraping === true;
                
                // API Rate Limiting settings
                var omdbRateLimit = config.OmdbRateLimitEnabled === true;
                var mdblistRateLimit = config.MdbListRateLimitEnabled === true;
                view.querySelector('#chkOmdbRateLimit').checked = omdbRateLimit;
                view.querySelector('#txtOmdbDailyLimit').value = config.OmdbDailyLimit || 1000;
                view.querySelector('#omdbLimitOptions').style.display = omdbRateLimit ? 'block' : 'none';
                view.querySelector('#chkMdbListRateLimit').checked = mdblistRateLimit;
                view.querySelector('#txtMdbListDailyLimit').value = config.MdbListDailyLimit || 1000;
                view.querySelector('#mdblistLimitOptions').style.display = mdblistRateLimit ? 'block' : 'none';
                
                // Smart scanning settings
                view.querySelector('#txtRescanInterval').value = config.RescanIntervalDays || 30;
                view.querySelector('#chkPrioritizeRecent').checked = config.PrioritizeRecentlyAdded !== false;
                view.querySelector('#txtRecentDays').value = config.RecentlyAddedDays || 7;
                view.querySelector('#chkSkipUnratedOnly').checked = config.SkipUnratedOnly === true;
                
                view.querySelector('#chkTestMode').checked = config.TestMode === true;

                loading.hide();
            }).catch(function (err) {
                console.error('Error loading config:', err);
                loading.hide();
                toast({ text: 'Error loading configuration' });
            });
        }

        saveConfig(view) {
            loading.show();

            ApiClient.getPluginConfiguration(pluginId).then(function (config) {
                config.OmdbApiKey = view.querySelector('#txtOmdbApiKey').value;
                config.MdbListApiKey = view.querySelector('#txtMdbListApiKey').value;
                
                // Convert string value to enum number for backend
                var sourceStr = view.querySelector('#selectPreferredSource').value;
                var sourceMap = { 'OMDb': 0, 'MDBList': 1, 'Both': 2 };
                config.PreferredSource = sourceMap[sourceStr] !== undefined ? sourceMap[sourceStr] : 0;
                
                config.UpdateCriticRating = view.querySelector('#chkUpdateCriticRating').checked;
                config.UpdateMovies = view.querySelector('#chkUpdateMovies').checked;
                config.UpdateSeries = view.querySelector('#chkUpdateSeries').checked;
                config.UpdateEpisodes = view.querySelector('#chkUpdateEpisodes').checked;
                config.EnableImdbScraping = view.querySelector('#chkEnableImdbScraping').checked;
                
                // API Rate Limiting settings
                config.OmdbRateLimitEnabled = view.querySelector('#chkOmdbRateLimit').checked;
                config.OmdbDailyLimit = parseInt(view.querySelector('#txtOmdbDailyLimit').value, 10) || 1000;
                config.MdbListRateLimitEnabled = view.querySelector('#chkMdbListRateLimit').checked;
                config.MdbListDailyLimit = parseInt(view.querySelector('#txtMdbListDailyLimit').value, 10) || 1000;
                
                // Smart scanning settings
                config.RescanIntervalDays = parseInt(view.querySelector('#txtRescanInterval').value, 10) || 30;
                config.PrioritizeRecentlyAdded = view.querySelector('#chkPrioritizeRecent').checked;
                config.RecentlyAddedDays = parseInt(view.querySelector('#txtRecentDays').value, 10) || 7;
                config.SkipUnratedOnly = view.querySelector('#chkSkipUnratedOnly').checked;
                
                config.TestMode = view.querySelector('#chkTestMode').checked;

                ApiClient.updatePluginConfiguration(pluginId, config).then(function () {
                    loading.hide();
                    toast({ text: 'Settings saved successfully!' });
                }).catch(function (err) {
                    console.error('Error saving config:', err);
                    loading.hide();
                    toast({ text: 'Error saving configuration' });
                });
            }).catch(function (err) {
                console.error('Error getting config:', err);
                loading.hide();
                toast({ text: 'Error saving configuration' });
            });
        }

        formatTime(date) {
            if (!date) return '--:--:--';
            var d = new Date(date);
            return d.toLocaleTimeString();
        }

        formatElapsed(ms) {
            var seconds = Math.floor(ms / 1000);
            var mins = Math.floor(seconds / 60);
            var secs = seconds % 60;
            var hours = Math.floor(mins / 60);
            mins = mins % 60;
            
            if (hours > 0) {
                return hours + 'h ' + mins + 'm ' + secs + 's';
            } else if (mins > 0) {
                return mins + 'm ' + secs + 's';
            }
            return secs + 's';
        }

        formatETA(seconds) {
            if (!seconds || seconds <= 0) return '--:--';
            
            var mins = Math.floor(seconds / 60);
            var secs = Math.floor(seconds % 60);
            var hours = Math.floor(mins / 60);
            mins = mins % 60;
            
            if (hours > 0) {
                return hours + 'h ' + mins + 'm';
            } else if (mins > 0) {
                return mins + 'm ' + secs + 's';
            }
            return secs + 's';
        }

        escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        renderResultList(view, items, listId, type) {
            var list = view.querySelector('#' + listId);
            list.innerHTML = '';
            
            var keys = Object.keys(items || {});
            if (keys.length === 0) {
                var emptyLi = document.createElement('li');
                emptyLi.className = 'resultEmpty';
                if (type === 'success') {
                    emptyLi.textContent = 'No items updated yet';
                } else if (type === 'skipped') {
                    emptyLi.textContent = 'No items skipped yet';
                } else {
                    emptyLi.textContent = 'No failures';
                }
                list.appendChild(emptyLi);
                return;
            }
            
            // Reverse to show most recent first
            keys.reverse();
            
            keys.forEach(function(name) {
                var detail = items[name];
                var li = document.createElement('li');
                li.className = 'resultItem ' + type;
                li.innerHTML = '<span class="resultItemName">' + this.escapeHtml(name) + '</span>' +
                              '<span class="resultItemDetail">' + this.escapeHtml(detail) + '</span>';
                list.appendChild(li);
            }, this);
        }

        updateProgressUI(view, progress) {
            if (!progress) return;
            
            // Handle both PascalCase and camelCase property names
            var percentComplete = progress.PercentComplete || progress.percentComplete || 0;
            var processedItems = progress.ProcessedItems || progress.processedItems || 0;
            var updatedItems = progress.UpdatedItems || progress.updatedItems || 0;
            var skippedItems = progress.SkippedItems || progress.skippedItems || 0;
            var errorItems = progress.ErrorItems || progress.errorItems || 0;
            var currentItem = progress.CurrentItem || progress.currentItem || '';
            var totalItems = progress.TotalItems || progress.totalItems || 0;
            var isRunning = progress.IsRunning || progress.isRunning || false;
            var startTime = progress.StartTime || progress.startTime;
            var eta = progress.EstimatedSecondsRemaining || progress.estimatedSecondsRemaining;
            var updatedDetails = progress.UpdatedDetails || progress.updatedDetails || {};
            var skippedDetails = progress.SkippedDetails || progress.skippedDetails || {};
            var failureDetails = progress.FailureDetails || progress.failureDetails || {};

            // Update progress bar
            var fill = view.querySelector('#progressBarFill');
            var text = view.querySelector('#progressBarText');
            fill.style.width = percentComplete + '%';
            text.textContent = Math.round(percentComplete) + '%';

            // Update stats
            view.querySelector('#statProcessed').textContent = processedItems;
            view.querySelector('#statUpdated').textContent = updatedItems;
            view.querySelector('#statSkipped').textContent = skippedItems;
            view.querySelector('#statErrors').textContent = errorItems;
            
            // Update badges
            view.querySelector('#updatedBadge').textContent = Object.keys(updatedDetails).length;
            view.querySelector('#skippedBadge').textContent = Object.keys(skippedDetails).length;
            view.querySelector('#failureBadge').textContent = Object.keys(failureDetails).length;

            // Update current item
            var currentItemBox = view.querySelector('#currentItemBox');
            var currentItemEl = view.querySelector('#currentItem');
            if (currentItem && isRunning) {
                currentItemEl.textContent = currentItem;
                currentItemBox.classList.remove('hide');
            } else {
                currentItemBox.classList.add('hide');
            }

            // Update ETA
            var etaBox = view.querySelector('#etaBox');
            var etaValue = view.querySelector('#etaValue');
            if (isRunning && eta && eta > 0) {
                etaValue.textContent = this.formatETA(eta);
                etaBox.classList.remove('hide');
            } else {
                etaBox.classList.add('hide');
            }

            // Render result lists
            this.renderResultList(view, updatedDetails, 'updatedList', 'success');
            this.renderResultList(view, skippedDetails, 'skippedList', 'skipped');
            this.renderResultList(view, failureDetails, 'failureList', 'failure');

            // Update start time for elapsed tracking
            if (startTime && !this.startTime) {
                this.startTime = new Date(startTime);
            }

            // Update status
            if (isRunning) {
                this.setStatus(view, 'running', 'Running (' + processedItems + '/' + totalItems + ')');
            }
            
            return { 
                isRunning: isRunning,
                updatedItems: updatedItems, 
                skippedItems: skippedItems, 
                errorItems: errorItems,
                totalItems: totalItems
            };
        }

        setStatus(view, status, text) {
            var badge = view.querySelector('#statusBadge');
            var statusText = view.querySelector('#statusText');
            badge.className = 'statusBadge ' + status;
            statusText.textContent = text;
        }

        updateElapsedTime(view) {
            if (!this.startTime) return;
            
            var elapsed = Date.now() - this.startTime.getTime();
            var elapsedEl = view.querySelector('#elapsedTime');
            elapsedEl.textContent = 'Elapsed: ' + this.formatElapsed(elapsed);
        }

        fetchProgress(view, forceFullRender) {
            var self = this;
            
            return ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/Progress'),
                dataType: 'json'
            }).then(function(progress) {
                return self.updateProgressUI(view, progress);
            }).catch(function(err) {
                console.error('Error fetching progress:', err);
                return null;
            });
        }

        startRefresh(view) {
            var self = this;

            // Check for API keys first
            ApiClient.getPluginConfiguration(pluginId).then(function(config) {
                if (!config.OmdbApiKey && !config.MdbListApiKey) {
                    toast({ text: 'Please configure at least one API key in Settings first.' });
                    return;
                }

                if (!config.UpdateMovies && !config.UpdateSeries && !config.UpdateEpisodes) {
                    toast({ text: 'Please enable at least one item type in Settings.' });
                    return;
                }

                // Reset UI
                self.startTime = null;
                view.querySelector('#btnRunRefresh').classList.add('hide');
                view.querySelector('#btnCancelRefresh').classList.remove('hide');
                view.querySelector('#progressSection').classList.remove('hide');
                view.querySelector('#elapsedTime').textContent = '';
                view.querySelector('#etaBox').classList.add('hide');
                self.setStatus(view, 'running', 'Starting...');
                
                // Reset stats display
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#progressBarFill').style.width = '0%';
                view.querySelector('#progressBarText').textContent = '0%';
                view.querySelector('#currentItemBox').classList.add('hide');
                view.querySelector('#updatedBadge').textContent = '0';
                view.querySelector('#skippedBadge').textContent = '0';
                view.querySelector('#failureBadge').textContent = '0';
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">No items updated yet</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">No items skipped yet</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">No failures</li>';

                // Get selection values
                var libraryId = view.querySelector('#selectLibrary').value;
                var seriesId = view.querySelector('#selectSeries').value;
                var seasonId = view.querySelector('#selectSeason').value;
                var episodeId = view.querySelector('#selectEpisode').value;
                var movieId = view.querySelector('#selectMovie').value;

                var addedWithinDays = 0;
                var addedWithinBox = view.querySelector('#addedWithinSelection');
                var addedWithinSelect = view.querySelector('#selectAddedWithin');
                if (addedWithinBox && !addedWithinBox.classList.contains('hide') && addedWithinSelect) {
                    addedWithinDays = parseInt(addedWithinSelect.value || '0', 10) || 0;
                }
                
                // Function to start the task
                function startTask() {
                    ApiClient.getScheduledTasks().then(function(tasks) {
                        var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                        
                        if (task) {
                            ApiClient.startScheduledTask(task.Id).then(function() {
                                self.startTime = new Date();
                                // Start polling for progress
                                self.startPolling(view, task.Id);
                            }).catch(function(err) {
                                self.setStatus(view, 'error', 'Failed to start');
                                self.stopRefresh(view);
                                toast({ text: 'Failed to start task: ' + err });
                            });
                        } else {
                            self.setStatus(view, 'error', 'Task not found');
                            self.stopRefresh(view);
                            toast({ text: 'Task not found - restart Emby Server' });
                        }
                    });
                }
                
                // If any selection is made, queue selected items first
                if (libraryId || seriesId || seasonId || episodeId || movieId) {
                    self.setStatus(view, 'running', 'Queuing selected items...');
                    
                    ApiClient.ajax({
                        type: 'POST',
                        url: ApiClient.getUrl('RatingSync/RunSelected'),
                        data: JSON.stringify({
                            LibraryId: libraryId || '',
                            SeriesId: seriesId || '',
                            SeasonId: seasonId || '',
                            EpisodeId: episodeId || '',
                            MovieId: movieId || '',
                            AddedWithinDays: addedWithinDays || 0
                        }),
                        contentType: 'application/json'
                    }).then(function() {
                        startTask();
                    }).catch(function(err) {
                        console.error('Error queuing selected items:', err);
                        // Fall back to full scan
                        startTask();
                    });
                } else {
                    // No selection - run full scan
                    startTask();
                }
            });
        }

        startPolling(view, taskId) {
            var self = this;
            
            if (self.pollInterval) {
                clearInterval(self.pollInterval);
            }
            if (self.elapsedInterval) {
                clearInterval(self.elapsedInterval);
            }

            // Update elapsed time every second
            self.elapsedInterval = setInterval(function() {
                self.updateElapsedTime(view);
            }, 1000);

            // Poll progress every 1.5 seconds
            self.pollInterval = setInterval(function() {
                // Fetch our custom progress API
                self.fetchProgress(view, false);
                
                // Also check task state
                ApiClient.getScheduledTask(taskId).then(function(task) {
                    if (task.State === 'Idle') {
                        // Task finished - fetch final progress
                        self.fetchProgress(view, false).then(function(stats) {
                            self.finishRefresh(view, stats);
                        });
                    }
                });
            }, 1500);
        }

        finishRefresh(view, stats) {
            var self = this;
            
            // Stop all intervals
            if (self.pollInterval) {
                clearInterval(self.pollInterval);
                self.pollInterval = null;
            }
            if (self.elapsedInterval) {
                clearInterval(self.elapsedInterval);
                self.elapsedInterval = null;
            }
            
            var updated = stats ? stats.updatedItems : 0;
            var skipped = stats ? stats.skippedItems : 0;
            var errors = stats ? stats.errorItems : 0;
            var total = stats ? stats.totalItems : 0;
            
            var statusText = 'Completed! ' + updated + ' updated';
            if (skipped > 0) statusText += ', ' + skipped + ' skipped';
            if (errors > 0) statusText += ', ' + errors + ' errors';
            
            self.setStatus(view, errors > 0 ? 'error' : 'completed', statusText);
            self.stopRefresh(view);
            
            // Hide ETA
            view.querySelector('#etaBox').classList.add('hide');
            
            // Final elapsed time update
            self.updateElapsedTime(view);
        }

        cancelRefresh(view) {
            var self = this;
            
            self.setStatus(view, 'warning', 'Cancelling...');
            
            ApiClient.getScheduledTasks().then(function(tasks) {
                var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                if (task && task.State === 'Running') {
                    ApiClient.stopScheduledTask(task.Id).then(function() {
                        self.setStatus(view, 'idle', 'Cancelled');
                        self.stopRefresh(view);
                    });
                } else {
                    self.stopRefresh(view);
                }
            });
        }

        stopRefresh(view) {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
            
            view.querySelector('#btnRunRefresh').classList.remove('hide');
            view.querySelector('#btnCancelRefresh').classList.add('hide');
            view.querySelector('#currentItemBox').classList.add('hide');
        }

        clearResults(view) {
            var self = this;
            
            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('RatingSync/ClearProgress')
            }).then(function() {
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#progressBarFill').style.width = '0%';
                view.querySelector('#progressBarText').textContent = '0%';
                view.querySelector('#elapsedTime').textContent = '';
                view.querySelector('#updatedBadge').textContent = '0';
                view.querySelector('#skippedBadge').textContent = '0';
                view.querySelector('#failureBadge').textContent = '0';
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">No items updated yet</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">No items skipped yet</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">No failures</li>';
                self.startTime = null;
                self.setStatus(view, 'idle', 'Ready');
            }).catch(function() {
                // Just clear locally if API fails
                view.querySelector('#statProcessed').textContent = '0';
                view.querySelector('#statUpdated').textContent = '0';
                view.querySelector('#statSkipped').textContent = '0';
                view.querySelector('#statErrors').textContent = '0';
                view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">No items updated yet</li>';
                view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">No items skipped yet</li>';
                view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">No failures</li>';
            });
        }

        checkInitialState(view) {
            var self = this;
            
            // First, always fetch existing progress to restore UI state
            self.fetchProgress(view, true).then(function(stats) {
                // Check if task is currently running
                ApiClient.getScheduledTasks().then(function(tasks) {
                    var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                    
                    if (task && task.State === 'Running') {
                        // Task is running, update UI and start polling
                        view.querySelector('#btnRunRefresh').classList.add('hide');
                        view.querySelector('#btnCancelRefresh').classList.remove('hide');
                        
                        // Resume elapsed time tracking if we have start time
                        if (stats && stats.isRunning) {
                            self.startPolling(view, task.Id);
                        }
                    } else {
                        // Task not running
                        if (stats && stats.totalItems > 0) {
                            // We have results from a previous run
                            var statusText = stats.updatedItems + ' updated, ' + stats.skippedItems + ' skipped';
                            if (stats.errorItems > 0) {
                                statusText += ', ' + stats.errorItems + ' errors';
                            }
                            self.setStatus(view, stats.errorItems > 0 ? 'error' : 'completed', 'Last run: ' + statusText);
                        }
                    }
                });
            });
        }

        onResume(options) {
            super.onResume(options);
            var self = this;
            var view = this.view;

            // Bind tab navigation
            self.bindTabNavigation(view);
            self.bindResultTabs(view);

            // Load configuration
            self.loadConfig(view);

            // Load API counters
            self.updateApiCounters(view);

            // Load libraries and bind selection
            self.loadLibraries(view);
            self.bindLibrarySelection(view);

            self.updateAddedWithinVisibility(view);

            // Check if task is already running and restore state
            self.checkInitialState(view);

            // Form submission
            var form = view.querySelector('.imdbRefreshConfigForm');
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    self.saveConfig(view);
                    return false;
                });
            }

            // Run button
            var btnRun = view.querySelector('#btnRunRefresh');
            if (btnRun) {
                btnRun.addEventListener('click', function() {
                    self.startRefresh(view);
                });
            }

            // Cancel button
            var btnCancel = view.querySelector('#btnCancelRefresh');
            if (btnCancel) {
                btnCancel.addEventListener('click', function() {
                    self.cancelRefresh(view);
                });
            }

            // Clear results button
            var btnClearResults = view.querySelector('#btnClearResults');
            if (btnClearResults) {
                btnClearResults.addEventListener('click', function() {
                    self.clearResults(view);
                });
            }

            // Rate limit checkbox toggles
            var chkOmdbRateLimit = view.querySelector('#chkOmdbRateLimit');
            if (chkOmdbRateLimit) {
                chkOmdbRateLimit.addEventListener('change', function() {
                    view.querySelector('#omdbLimitOptions').style.display = this.checked ? 'block' : 'none';
                });
            }
            var chkMdbListRateLimit = view.querySelector('#chkMdbListRateLimit');
            if (chkMdbListRateLimit) {
                chkMdbListRateLimit.addEventListener('change', function() {
                    view.querySelector('#mdblistLimitOptions').style.display = this.checked ? 'block' : 'none';
                });
            }
            
            // History tab bindings
            var btnLoadMissing = view.querySelector('#btnLoadMissing');
            if (btnLoadMissing) {
                btnLoadMissing.addEventListener('click', function() {
                    self.loadMissingData(view);
                });
            }

            var btnScanMissingSelected = view.querySelector('#btnScanMissingSelected');
            if (btnScanMissingSelected) {
                btnScanMissingSelected.addEventListener('click', function() {
                    self.scanSelectedMissingItem(view);
                });
            }

            var missingDataType = view.querySelector('#missingDataType');
            if (missingDataType) {
                missingDataType.addEventListener('change', function() {
                    if (self.missingDataCache) {
                        self.renderMissingData(view, self.missingDataCache);
                    }
                });
            }

            var missingDataIssue = view.querySelector('#missingDataIssue');
            if (missingDataIssue) {
                missingDataIssue.addEventListener('change', function() {
                    if (self.missingDataCache) {
                        self.renderMissingData(view, self.missingDataCache);
                    }
                });
            }
            
            var btnSearchHistory = view.querySelector('#btnSearchHistory');
            if (btnSearchHistory) {
                btnSearchHistory.addEventListener('click', function() {
                    self.searchItemHistory(view);
                });
            }
            
            var txtItemSearch = view.querySelector('#txtItemSearch');
            if (txtItemSearch) {
                txtItemSearch.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        self.searchItemHistory(view);
                    }
                });
            }

            // Scan report modal bindings
            var btnCloseScanReport = view.querySelector('#btnCloseScanReport');
            if (btnCloseScanReport) {
                btnCloseScanReport.addEventListener('click', function() {
                    self.closeScanReport(view);
                });
            }

            var scanReportBackdrop = view.querySelector('#scanReportBackdrop');
            if (scanReportBackdrop) {
                scanReportBackdrop.addEventListener('click', function() {
                    self.closeScanReport(view);
                });
            }

            var btnCopyScanReport = view.querySelector('#btnCopyScanReport');
            if (btnCopyScanReport) {
                btnCopyScanReport.addEventListener('click', function() {
                    self.copyScanReportToClipboard(view);
                });
            }

            var btnDeleteScan = view.querySelector('#btnDeleteScan');
            if (btnDeleteScan) {
                btnDeleteScan.addEventListener('click', function() {
                    var s = self.activeScanReportSession;
                    var sessionId = s && s.SessionId ? s.SessionId : null;
                    self.deleteScanBySessionId(view, sessionId);
                });
            }

            // ESC closes modal (bind once)
            if (!self._scanReportKeydownBound) {
                self._scanReportKeydownBound = true;
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        self.closeScanReport(view);
                    }
                });
            }
        }

        // History tab methods
        loadScanHistory(view) {
            var self = this;
            var container = view.querySelector('#sessionList');
            container.innerHTML = '<p class="loadingText">Loading scan history...</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/History', { Count: 20 }),
                dataType: 'json'
            }).then(function(sessions) {
                self.scanHistorySessions = sessions || [];

                if (!sessions || sessions.length === 0) {
                    container.innerHTML = '<p class="emptyText">No scan history yet. Run a scan to see history here.</p>';
                    return;
                }
                
                var html = '';
                sessions.forEach(function(session, idx) {
                    var startDate = new Date(session.StartTime);
                    var endDate = session.EndTime ? new Date(session.EndTime) : null;
                    var duration = endDate ? self.formatElapsed(endDate - startDate) : 'In progress...';
                    
                    var cardClass = 'sessionCard';
                    if (session.WasCancelled) cardClass += ' cancelled';
                    if (session.ErrorItems > 0) cardClass += ' hasErrors';
                    
                    html += '<div class="' + cardClass + '" data-index="' + idx + '" role="button" tabindex="0">';
                    html += '<div class="sessionHeader">';
                    html += '<div class="sessionHeaderLeft">';
                    html += '<div class="sessionDate">' + self.formatDateTime(startDate) + '</div>';
                    html += '</div>';
                    html += '<div class="sessionHeaderRight">';
                    html += '<span class="sessionDuration">' + duration + (session.WasCancelled ? ' (Cancelled)' : '') + '</span>';
                    if (session.SessionId) {
                        html += '<button type="button" class="sessionDeleteBtn" data-action="delete-scan" data-session-id="' + self.escapeHtml(session.SessionId) + '">Delete</button>';
                    }
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="sessionStats">';
                    html += '<span class="sessionStat"><span class="label">Total: </span><span class="value">' + session.TotalItems + '</span></span>';
                    html += '<span class="sessionStat updated"><span class="label">Updated: </span><span class="value">' + session.UpdatedItems + '</span></span>';
                    html += '<span class="sessionStat skipped"><span class="label">Skipped: </span><span class="value">' + session.SkippedItems + '</span></span>';
                    html += '<span class="sessionStat errors"><span class="label">Errors: </span><span class="value">' + session.ErrorItems + '</span></span>';
                    html += '</div>';

                    html += '<div class="sessionCta"><span>View report</span><span class="arrow">→</span></div>';
                    html += '</div>';
                });
                
                container.innerHTML = html;

                // Click-to-open report (event delegation)
                container.onclick = function(e) {
                    var del = e.target && e.target.closest ? e.target.closest('.sessionDeleteBtn') : null;
                    if (del) {
                        e.preventDefault();
                        e.stopPropagation();
                        var sid = del.getAttribute('data-session-id');
                        self.deleteScanBySessionId(view, sid);
                        return;
                    }

                    var card = e.target && e.target.closest ? e.target.closest('.sessionCard') : null;
                    if (!card) return;
                    var index = parseInt(card.getAttribute('data-index') || '', 10);
                    if (isNaN(index) || !self.scanHistorySessions || !self.scanHistorySessions[index]) return;
                    self.openScanReport(view, self.scanHistorySessions[index]);
                };

                // Keyboard support
                container.onkeydown = function(e) {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    var card = e.target && e.target.classList && e.target.classList.contains('sessionCard') ? e.target : null;
                    if (!card) return;
                    e.preventDefault();
                    var index = parseInt(card.getAttribute('data-index') || '', 10);
                    if (isNaN(index) || !self.scanHistorySessions || !self.scanHistorySessions[index]) return;
                    self.openScanReport(view, self.scanHistorySessions[index]);
                };
            }).catch(function(err) {
                console.error('Error loading scan history:', err);
                container.innerHTML = '<p class="emptyText">Error loading scan history.</p>';
            });
        }

        openScanReport(view, session) {
            var self = this;
            var modal = view.querySelector('#scanReportModal');
            if (!modal) return;

            this.activeScanReportSession = session || null;
            this.activeScanReport = null;
            this.scanReportState = {
                activeTab: 'overview',
                filterText: '',
                pageSize: 100,
                page: { updated: 1, skipped: 1, errors: 1 }
            };

            var title = view.querySelector('#scanReportTitle');
            if (title) {
                var startDate = session && session.StartTime ? new Date(session.StartTime) : null;
                title.textContent = startDate ? ('Scan Report — ' + this.formatDateTime(startDate)) : 'Scan Report';
            }

            var body = view.querySelector('#scanReportBody');
            if (body) {
                body.innerHTML = '<p class="loadingText">Loading scan report...</p>';
            }

            // Load full report if available; otherwise fallback to session summary
            var sessionId = session && session.SessionId ? session.SessionId : null;
            if (sessionId) {
                ApiClient.ajax({
                    type: 'GET',
                    url: ApiClient.getUrl('RatingSync/HistoryReport', { SessionId: sessionId }),
                    dataType: 'json'
                }).then(function(report) {
                    self.activeScanReport = report || null;
                    self.rerenderScanReport(view);
                }).catch(function() {
                    self.activeScanReport = null;
                    self.rerenderScanReport(view);
                });
            } else {
                this.rerenderScanReport(view);
            }

            modal.classList.remove('hide');
        }

        bindScanReportBodyEvents(view) {
            var self = this;
            var body = view.querySelector('#scanReportBody');
            if (!body) return;

            // Tab switching + pagination + filter + download
            body.onclick = function(e) {
                var tab = e.target && e.target.closest ? e.target.closest('[data-report-tab]') : null;
                if (tab) {
                    var t = tab.getAttribute('data-report-tab');
                    if (t) {
                        self.scanReportState.activeTab = t;
                        self.rerenderScanReport(view);
                    }
                    return;
                }

                var btn = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
                if (!btn) return;
                var action = btn.getAttribute('data-action');
                if (!action) return;

                if (action === 'prev-updated') self.scanReportState.page.updated = Math.max(1, (self.scanReportState.page.updated || 1) - 1);
                if (action === 'next-updated') self.scanReportState.page.updated = (self.scanReportState.page.updated || 1) + 1;
                if (action === 'prev-skipped') self.scanReportState.page.skipped = Math.max(1, (self.scanReportState.page.skipped || 1) - 1);
                if (action === 'next-skipped') self.scanReportState.page.skipped = (self.scanReportState.page.skipped || 1) + 1;
                if (action === 'prev-errors') self.scanReportState.page.errors = Math.max(1, (self.scanReportState.page.errors || 1) - 1);
                if (action === 'next-errors') self.scanReportState.page.errors = (self.scanReportState.page.errors || 1) + 1;

                if (action === 'download-json') {
                    self.downloadScanReportJson();
                    return;
                }

                self.rerenderScanReport(view);
            };

            var filter = body.querySelector('#scanReportFilter');
            if (filter) {
                filter.oninput = function() {
                    self.scanReportState.filterText = filter.value || '';
                    self.scanReportState.page.updated = 1;
                    self.scanReportState.page.skipped = 1;
                    self.scanReportState.page.errors = 1;
                    self.rerenderScanReport(view);
                };
            }

            var pageSize = body.querySelector('#scanReportPageSize');
            if (pageSize) {
                pageSize.onchange = function() {
                    self.scanReportState.pageSize = parseInt(pageSize.value || '100', 10) || 100;
                    self.scanReportState.page.updated = 1;
                    self.scanReportState.page.skipped = 1;
                    self.scanReportState.page.errors = 1;
                    self.rerenderScanReport(view);
                };
            }
        }

        rerenderScanReport(view) {
            var body = view.querySelector('#scanReportBody');
            if (!body) return;
            body.innerHTML = this.renderScanReportHtml(this.activeScanReport, this.activeScanReportSession);
            this.bindScanReportBodyEvents(view);
        }

        closeScanReport(view) {
            var modal = view.querySelector('#scanReportModal');
            if (!modal) return;
            if (modal.classList.contains('hide')) return;
            modal.classList.add('hide');
        }

        renderScanReportHtml(report, sessionFallback) {
            var self = this;

            var isLegacy = !report;
            var src = report || sessionFallback;
            if (!src) {
                return '<p class="emptyText">No report data found.</p>';
            }

            var startDate = src.StartTime ? new Date(src.StartTime) : null;
            var endDate = src.EndTime ? new Date(src.EndTime) : null;
            var duration = (startDate && endDate)
                ? self.formatElapsed(endDate - startDate)
                : (src.WasCancelled ? 'Cancelled' : (endDate ? '' : 'In progress'));

            var statusText;
            if (!endDate && !src.WasCancelled) statusText = 'In progress';
            else if (src.WasCancelled) statusText = 'Cancelled';
            else if ((src.ErrorItems || 0) > 0) statusText = 'Completed with errors';
            else statusText = 'Completed';

            var processed = (typeof src.ProcessedItems === 'number' && src.ProcessedItems >= 0)
                ? src.ProcessedItems
                : src.TotalItems;

            var updatedEntries = report
                ? (report.Updated || []).map(function(e) { return { name: e.Name, detail: e.Detail }; })
                : self.objectToPairs(src.UpdatedDetails);
            var skippedEntries = report
                ? (report.Skipped || []).map(function(e) { return { name: e.Name, detail: e.Detail }; })
                : self.objectToPairs(src.SkippedDetails);
            var errorEntries = report
                ? (report.Errors || []).map(function(e) { return { name: e.Name, detail: e.Detail }; })
                : self.objectToPairs(src.FailureDetails);

            if ((!updatedEntries || updatedEntries.length === 0) && src.UpdatedItemNames && src.UpdatedItemNames.length > 0) {
                updatedEntries = src.UpdatedItemNames.map(function(n) { return { name: n, detail: '' }; });
            }

            var state = self.scanReportState || { activeTab: 'overview', filterText: '', pageSize: 100, page: { updated: 1, skipped: 1, errors: 1 } };
            var filterText = (state.filterText || '').toLowerCase();
            var pageSize = state.pageSize || 100;

            updatedEntries = self.applyEntryFilter(updatedEntries, filterText);
            skippedEntries = self.applyEntryFilter(skippedEntries, filterText);
            errorEntries = self.applyEntryFilter(errorEntries, filterText);

            var summary = self.buildReportSummary(updatedEntries, skippedEntries, errorEntries);

            var html = '';
            if (isLegacy) {
                html += '<div class="noteBox"><strong>Legacy scan:</strong> this scan ran before detailed reports were enabled, so only limited info may be available.</div>';
            }

            html += '<div class="reportMeta">';
            html += self.reportMetaBox('Started', startDate ? self.formatDateTime(startDate) : '');
            html += self.reportMetaBox('Finished', endDate ? self.formatDateTime(endDate) : (src.WasCancelled ? 'Cancelled' : 'In progress'));
            html += self.reportMetaBox('Duration', duration || (endDate ? '' : 'In progress'));
            html += self.reportMetaBox('Processed', processed + ' / ' + src.TotalItems);
            html += self.reportMetaBox('Updated', String(src.UpdatedItems || 0));
            html += self.reportMetaBox('Skipped', String(src.SkippedItems || 0));
            html += self.reportMetaBox('Errors', String(src.ErrorItems || 0));
            html += self.reportMetaBox('OMDb calls', String(src.OmdbRequests || 0));
            html += self.reportMetaBox('MDBList calls', String(src.MdbListRequests || 0));
            html += self.reportMetaBox('IMDb API calls', String(src.ImdbScrapeRequests || 0));
            html += self.reportMetaBox('Status', statusText);
            html += '</div>';

            html += '<div class="reportFilterRow">';
            html += '<input id="scanReportFilter" type="text" placeholder="Search (name or details)…" value="' + self.escapeHtml(state.filterText || '') + '" />';
            html += '<select id="scanReportPageSize" style="padding:0.55em 0.7em;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.35);color:rgba(255,255,255,0.9)">'
                + '<option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50 / page</option>'
                + '<option value="100"' + (pageSize === 100 ? ' selected' : '') + '>100 / page</option>'
                + '<option value="250"' + (pageSize === 250 ? ' selected' : '') + '>250 / page</option>'
                + '</select>';
            html += '<button type="button" class="reportSmallBtn" data-action="download-json"' + (report ? '' : ' disabled') + '>Download JSON</button>';
            html += '</div>';

            html += self.renderReportTabs(state.activeTab, updatedEntries.length, skippedEntries.length, errorEntries.length);

            if (state.activeTab === 'overview') {
                html += self.renderOverviewSummary(summary);
            } else if (state.activeTab === 'updated') {
                html += self.renderPagedList('Updated Items', updatedEntries, 'updated', pageSize, state.page.updated || 1, 'prev-updated', 'next-updated');
            } else if (state.activeTab === 'skipped') {
                html += self.renderPagedList('Skipped Items', skippedEntries, 'skipped', pageSize, state.page.skipped || 1, 'prev-skipped', 'next-skipped');
            } else if (state.activeTab === 'errors') {
                html += self.renderPagedList('Errors', errorEntries, 'failure', pageSize, state.page.errors || 1, 'prev-errors', 'next-errors');
            }

            return html;
        }

        reportMetaBox(label, value) {
            var tone = 'tone-neutral';
            var key = (label || '').toLowerCase();
            if (key === 'updated') tone = 'tone-updated';
            else if (key === 'skipped') tone = 'tone-skipped';
            else if (key === 'errors') tone = 'tone-errors';
            else if (key === 'status') tone = 'tone-status';
            else if (key === 'processed') tone = 'tone-neutral';
            else if (key === 'started' || key === 'finished' || key === 'duration') tone = 'tone-time';

            return '<div class="reportMetaBox ' + tone + '">'
                + '<div class="reportMetaLabel">' + this.escapeHtml(label) + '</div>'
                + '<div class="reportMetaValue">' + this.escapeHtml(value || '') + '</div>'
                + '</div>';
        }

        renderReportTabs(activeTab, updatedCount, skippedCount, errorCount) {
            var tab = function(id, label, count) {
                var cls = 'reportSmallBtn' + (activeTab === id ? ' ui-btn-active' : '');
                var countText = (count === '' || count === null || typeof count === 'undefined') ? '' : (' (' + count + ')');
                return '<button type="button" class="' + cls + '" data-report-tab="' + id + '">' + label + countText + '</button>';
            };

            var html = '<div class="reportFilterRow" style="margin-top:-0.25em">';
            html += tab('overview', 'Overview', '');
            html += tab('updated', 'Updated', updatedCount);
            html += tab('skipped', 'Skipped', skippedCount);
            html += tab('errors', 'Errors', errorCount);
            html += '</div>';
            return html;
        }

        renderOverviewSummary(summary) {
            var self = this;
            var html = '';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-updated">Updated — by type</h4>';
            html += self.renderCountChips(summary.updatedByType, 'updated');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-updated">Updated — by source</h4>';
            html += self.renderCountChips(summary.updatedBySource, 'updated');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-skipped">Skipped — top reasons</h4>';
            html += self.renderCountChips(summary.skippedByReason, 'skipped');
            html += '</div>';

            html += '<div class="reportSection">';
            html += '<h4 class="reportH tone-errors">Errors — top messages</h4>';
            html += self.renderCountChips(summary.errorsByMessage, 'errors');
            html += '</div>';

            return html;
        }

        renderCountChips(countsObj, tone) {
            var entries = Object.keys(countsObj || {}).map(function(k) { return { key: k, count: countsObj[k] }; });
            entries.sort(function(a, b) { return b.count - a.count; });
            if (entries.length === 0) return '<p class="reportNote">No data.</p>';

            var html = '<div style="display:flex;flex-wrap:wrap;gap:0.5em">';
            entries.slice(0, 20).forEach(function(e) {
                html += '<span class="reportChip ' + this.escapeHtml('tone-' + (tone || 'neutral')) + '">' 
                    + '<span class="reportChipCount">' + e.count + '</span>'
                    + '<span class="reportChipText">' + this.escapeHtml(e.key) + '</span>'
                    + '</span>';
            }.bind(this));
            html += '</div>';
            return html;
        }

        normalizeSkippedReason(reason) {
            if (!reason) return reason;
            var text = String(reason).trim();
            // Drop trailing "(6.9)" / "(75%)" / etc to avoid splitting the same reason by rating value.
            var m = text.match(/^(.*?)(\s*\(([^)]*)\))\s*$/);
            if (m && m[3] && /[0-9]/.test(m[3])) {
                text = (m[1] || '').trim();
            }
            return text.replace(/\s+/g, ' ').trim();
        }

        buildReportSummary(updatedEntries, skippedEntries, errorEntries) {
            var self = this;
            var inc = function(obj, key) {
                if (!key) key = 'Unknown';
                obj[key] = (obj[key] || 0) + 1;
            };

            var updatedByType = {};
            var updatedBySource = {};
            (updatedEntries || []).forEach(function(e) {
                var d = e && e.detail ? e.detail : '';
                var hasImdb = d.indexOf('IMDb community') >= 0 || d.indexOf('IMDb:') >= 0;
                var hasRt = d.indexOf('RT critic') >= 0 || d.indexOf('RT:') >= 0;
                var type = hasImdb && hasRt ? 'IMDb + RT' : (hasImdb ? 'IMDb only' : (hasRt ? 'RT only' : 'Other'));
                inc(updatedByType, type);

                var src = self.extractSourceLabel(d);
                inc(updatedBySource, src || 'Unknown');
            });

            var skippedByReason = {};
            (skippedEntries || []).forEach(function(e) {
                var d = e && e.detail ? String(e.detail) : '';
                var primary = d.split(',')[0].trim();
                primary = self.normalizeSkippedReason(primary);
                inc(skippedByReason, primary || 'Unknown');
            });

            var errorsByMessage = {};
            (errorEntries || []).forEach(function(e) {
                var d = e && e.detail ? String(e.detail) : '';
                inc(errorsByMessage, d || 'Unknown');
            });

            return {
                updatedByType: updatedByType,
                updatedBySource: updatedBySource,
                skippedByReason: skippedByReason,
                errorsByMessage: errorsByMessage
            };
        }

        extractSourceLabel(detail) {
            if (!detail) return null;
            var match = String(detail).match(/\(([^()]+)\)\s*$/);
            return match && match[1] ? match[1] : null;
        }

        renderPagedList(title, entries, typeClass, pageSize, page, prevAction, nextAction) {
            entries = entries || [];
            page = page || 1;
            pageSize = pageSize || 100;
            var total = entries.length;
            var pages = Math.max(1, Math.ceil(total / pageSize));
            if (page > pages) page = pages;
            var start = (page - 1) * pageSize;
            var slice = entries.slice(start, start + pageSize);

            var html = '<div class="reportSection">';
            html += '<h4>' + this.escapeHtml(title) + '</h4>';

            html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75em;flex-wrap:wrap;margin:0.25em 0 0.75em 0">';
            html += '<div class="reportNote" style="margin:0">Showing ' + (total === 0 ? 0 : (start + 1)) + '-' + Math.min(total, start + pageSize) + ' of ' + total + '</div>';
            html += '<div style="display:flex;gap:0.5em">'
                + '<button type="button" class="reportSmallBtn" data-action="' + prevAction + '"' + (page <= 1 ? ' disabled' : '') + '>Prev</button>'
                + '<button type="button" class="reportSmallBtn" data-action="' + nextAction + '"' + (page >= pages ? ' disabled' : '') + '>Next</button>'
                + '</div>';
            html += '</div>';

            if (slice.length === 0) {
                html += '<p class="reportNote">No items.</p>';
                html += '</div>';
                return html;
            }

            html += '<ul class="reportList">';
            slice.forEach(function(item) {
                var name = item && item.name ? item.name : '';
                var detail = item && item.detail ? item.detail : '';
                html += '<li class="reportListItem ' + typeClass + '">' +
                    '<div class="reportItemName">' + this.escapeHtml(name) + '</div>' +
                    '<div class="reportItemDetail">' + this.escapeHtml(detail) + '</div>' +
                    '</li>';
            }.bind(this));
            html += '</ul>';
            html += '</div>';
            return html;
        }

        downloadScanReportJson() {
            var report = this.activeScanReport;
            if (!report) {
                toast('Report not available for this scan');
                return;
            }
            try {
                var json = JSON.stringify(report, null, 2);
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'rating-sync-scan-report-' + (report.SessionId || 'report') + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function() { URL.revokeObjectURL(url); }, 250);
            } catch (e) {
                toast('Failed to download report');
            }
        }

        applyEntryFilter(entries, filterText) {
            if (!filterText) return entries || [];
            var ft = String(filterText).toLowerCase();
            return (entries || []).filter(function(e) {
                var name = (e && (e.Name || e.name) ? String(e.Name || e.name) : '').toLowerCase();
                var detail = (e && (e.Detail || e.detail) ? String(e.Detail || e.detail) : '').toLowerCase();
                return name.indexOf(ft) >= 0 || detail.indexOf(ft) >= 0;
            });
        }

        objectToPairs(obj) {
            if (!obj) return [];
            var keys = Object.keys(obj);
            keys.sort();
            return keys.map(function(k) { return { name: k, detail: obj[k] }; });
        }

        copyScanReportToClipboard(view) {
            var text = this.buildScanReportText(this.activeScanReport, this.activeScanReportSession);
            if (!text) {
                toast('No report to copy');
                return;
            }
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                toast('Clipboard not available in this environment');
                return;
            }

            navigator.clipboard.writeText(text).then(function() {
                toast('Report copied');
            }).catch(function() {
                toast('Failed to copy report');
            });
        }

        buildScanReportText(report, sessionFallback) {
            var src = report || sessionFallback;
            if (!src) return null;

            var startDate = src.StartTime ? new Date(src.StartTime) : null;
            var endDate = src.EndTime ? new Date(src.EndTime) : null;
            var lines = [];
            lines.push('Rating Sync - Scan Report');
            if (startDate) lines.push('Started: ' + this.formatDateTime(startDate));
            if (endDate) lines.push('Finished: ' + this.formatDateTime(endDate));
            lines.push('Total: ' + (src.TotalItems || 0));
            lines.push('Processed: ' + ((typeof src.ProcessedItems === 'number') ? src.ProcessedItems : (src.TotalItems || 0)));
            lines.push('Updated: ' + (src.UpdatedItems || 0));
            lines.push('Skipped: ' + (src.SkippedItems || 0));
            lines.push('Errors: ' + (src.ErrorItems || 0));
            lines.push('');

            var addList = function(title, list) {
                lines.push(title + ':');
                (list || []).forEach(function(e) {
                    var name = e && (e.Name || e.name) ? (e.Name || e.name) : '';
                    var detail = e && (e.Detail || e.detail) ? (e.Detail || e.detail) : '';
                    var line = '- ' + name;
                    if (detail) line += ' — ' + detail;
                    lines.push(line);
                });
                lines.push('');
            };

            if (report) {
                addList('Updated', report.Updated);
                addList('Skipped', report.Skipped);
                addList('Errors', report.Errors);
            } else {
                addList('Updated', this.objectToPairs(src.UpdatedDetails));
                addList('Skipped', this.objectToPairs(src.SkippedDetails));
                addList('Errors', this.objectToPairs(src.FailureDetails));
            }

            return lines.join('\n');
        }

        loadMissingData(view) {
            var self = this;
            var container = view.querySelector('#missingDataContainer');
            var type = view.querySelector('#missingDataType').value;

            self.selectedMissingId = null;
            self.selectedMissingItem = null;
            var scanBtn = view.querySelector('#btnScanMissingSelected');
            if (scanBtn) scanBtn.disabled = true;
            
            container.innerHTML = '<p class="loadingText">Searching for items with missing data...</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/MissingData', { Type: type }),
                dataType: 'json'
            }).then(function(items) {
                self.missingDataCache = items || [];
                if (!items || items.length === 0) {
                    container.innerHTML = '<p class="emptyText">No items found with missing data. Great job!</p>';
                    return;
                }

                self.renderMissingData(view, items);
            }).catch(function(err) {
                console.error('Error loading missing data:', err);
                container.innerHTML = '<p class="emptyText">Error searching for missing data.</p>';
            });
        }

        renderMissingData(view, items) {
            var self = this;
            var container = view.querySelector('#missingDataContainer');
            var issue = (view.querySelector('#missingDataIssue') && view.querySelector('#missingDataIssue').value) || '';
            var selectedType = (view.querySelector('#missingDataType') && view.querySelector('#missingDataType').value) || '';
            var showEpisodeContext = (selectedType === '' || selectedType === 'episodes');

            var filtered = (items || []).filter(function(item) {
                if (!issue) return true;
                var reason = item && item.MissingReason ? item.MissingReason : '';
                if (issue === 'imdb') return reason.indexOf('No IMDb ID') >= 0;
                if (issue === 'community') return reason.indexOf('No Community Rating') >= 0;
                if (issue === 'critic') return reason.indexOf('No Critic Rating') >= 0;
                return true;
            });

            if (!filtered || filtered.length === 0) {
                container.innerHTML = '<p class="emptyText">No items match the selected filters.</p>';
                return;
            }

            var html = '<table class="dataTable" id="missingDataTable">';
            html += '<thead><tr>';
            html += '<th>Name</th>';
            if (showEpisodeContext) {
                html += '<th>Series</th>';
                html += '<th>Season</th>';
            }
            html += '<th>Type</th>';
            html += '<th>IMDb ID</th>';
            html += '<th>Community Rating</th>';
            html += '<th>Critic Rating</th>';
            html += '<th>Issue</th>';
            html += '</tr></thead>';
            html += '<tbody>';

            filtered.forEach(function(item, idx) {
                var typeClass = item.Type.toLowerCase();
                var isSelected = self.selectedMissingId && item.Id === self.selectedMissingId;
                html += '<tr data-index="' + idx + '"' + (isSelected ? ' class="selected"' : '') + '>';

                var displayName = item.Name;
                if (item.Year && displayName && displayName.indexOf('(' + item.Year + ')') === -1) {
                    displayName += ' (' + item.Year + ')';
                }

                html += '<td>' + self.escapeHtml(displayName) + '</td>';

                if (showEpisodeContext) {
                    var seriesName = item.SeriesName || '—';
                    var seasonText = '—';
                    if (item.SeasonNumber != null) {
                        var sn = item.SeasonNumber;
                        seasonText = 'S' + (sn < 10 ? '0' + sn : sn);
                    } else if (item.SeasonName) {
                        seasonText = item.SeasonName;
                    }

                    html += '<td>' + self.escapeHtml(seriesName) + '</td>';
                    html += '<td>' + self.escapeHtml(seasonText) + '</td>';
                }

                html += '<td><span class="type-badge ' + typeClass + '">' + item.Type + '</span></td>';
                html += '<td class="' + (item.HasImdbId ? 'present' : 'missing') + '">' + (item.ImdbId || '—') + '</td>';
                html += '<td class="' + (item.HasCommunityRating ? 'present' : 'missing') + '">' + (item.CommunityRating ? item.CommunityRating.toFixed(1) : '—') + '</td>';
                html += '<td class="' + (item.HasCriticRating ? 'present' : 'missing') + '">' + (item.CriticRating ? item.CriticRating.toFixed(0) + '%' : '—') + '</td>';
                html += '<td>' + self.escapeHtml(item.MissingReason) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table>';
            html += '<p style="padding: 0.75em 1em; font-size: 0.85em; color: rgba(255,255,255,0.5);">Showing ' + filtered.length + ' items (max 500)</p>';

            container.innerHTML = html;

            // Bind row click -> select + run item history search
            var table = view.querySelector('#missingDataTable');
            if (!table) return;

            Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function(row) {
                row.addEventListener('click', function() {
                    var index = parseInt(row.getAttribute('data-index'), 10);
                    var selected = filtered[index];
                    if (!selected) return;

                    self.selectedMissingId = selected.Id;
                    self.selectedMissingItem = selected;

                    var scanBtn = view.querySelector('#btnScanMissingSelected');
                    if (scanBtn) scanBtn.disabled = false;

                    // Re-render to update selected row highlight
                    self.renderMissingData(view, self.missingDataCache || []);
                });
            });
        }

        scanSelectedMissingItem(view) {
            var self = this;
            var selected = self.selectedMissingItem;

            if (!selected) {
                toast({ text: 'Select an item first.' });
                return;
            }

            // Switch to Run tab so the user can see progress
            var navButtons = view.querySelectorAll('.localnav .nav-button');
            navButtons.forEach(function(b) { b.classList.remove('ui-btn-active'); });
            var runBtn = view.querySelector('.localnav .nav-button[data-target="runPage"]');
            if (runBtn) runBtn.classList.add('ui-btn-active');
            view.querySelectorAll('.tabPage').forEach(function(page) {
                page.classList.remove('active');
            });
            var runPage = view.querySelector('#runPage');
            if (runPage) runPage.classList.add('active');

            // Reset UI like startRefresh
            self.startTime = null;
            view.querySelector('#btnRunRefresh').classList.add('hide');
            view.querySelector('#btnCancelRefresh').classList.remove('hide');
            view.querySelector('#progressSection').classList.remove('hide');
            view.querySelector('#elapsedTime').textContent = '';
            view.querySelector('#etaBox').classList.add('hide');
            self.setStatus(view, 'running', 'Queuing selected item...');
            view.querySelector('#statProcessed').textContent = '0';
            view.querySelector('#statUpdated').textContent = '0';
            view.querySelector('#statSkipped').textContent = '0';
            view.querySelector('#statErrors').textContent = '0';
            view.querySelector('#progressBarFill').style.width = '0%';
            view.querySelector('#progressBarText').textContent = '0%';
            view.querySelector('#currentItemBox').classList.add('hide');
            view.querySelector('#updatedBadge').textContent = '0';
            view.querySelector('#skippedBadge').textContent = '0';
            view.querySelector('#failureBadge').textContent = '0';
            view.querySelector('#updatedList').innerHTML = '<li class="resultEmpty">No items updated yet</li>';
            view.querySelector('#skippedList').innerHTML = '<li class="resultEmpty">No items skipped yet</li>';
            view.querySelector('#failureList').innerHTML = '<li class="resultEmpty">No failures</li>';

            var payload = {
                LibraryId: '',
                SeriesId: '',
                SeasonId: '',
                EpisodeId: '',
                MovieId: ''
            };

            if (selected.Type === 'Movie') {
                payload.MovieId = selected.Id;
            } else if (selected.Type === 'Series') {
                payload.SeriesId = selected.Id;
            } else if (selected.Type === 'Episode') {
                payload.EpisodeId = selected.Id;
            } else {
                toast({ text: 'Unsupported item type: ' + selected.Type });
                self.setStatus(view, 'error', 'Unsupported item type');
                self.stopRefresh(view);
                return;
            }

            function startTask() {
                ApiClient.getScheduledTasks().then(function(tasks) {
                    var task = tasks.find(function(t) { return t.Key === 'RatingSync'; });
                    if (task) {
                        ApiClient.startScheduledTask(task.Id).then(function() {
                            self.startTime = new Date();
                            self.startPolling(view, task.Id);
                        }).catch(function(err) {
                            self.setStatus(view, 'error', 'Failed to start');
                            self.stopRefresh(view);
                            toast({ text: 'Failed to start task: ' + err });
                        });
                    } else {
                        self.setStatus(view, 'error', 'Task not found');
                        self.stopRefresh(view);
                        toast({ text: 'Task not found - restart Emby Server' });
                    }
                });
            }

            ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl('RatingSync/RunSelected'),
                data: JSON.stringify(payload),
                contentType: 'application/json'
            }).then(function() {
                startTask();
            }).catch(function(err) {
                console.error('Error queuing selected item:', err);
                self.setStatus(view, 'error', 'Failed to queue');
                self.stopRefresh(view);
                toast({ text: 'Failed to queue selected item: ' + err });
            });
        }

        searchItemHistory(view) {
            var self = this;
            var container = view.querySelector('#itemHistoryContainer');
            var search = view.querySelector('#txtItemSearch').value;
            
            container.innerHTML = '<p class="loadingText">Searching item history...</p>';
            
            ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('RatingSync/ItemHistory', { Search: search, Limit: 100 }),
                dataType: 'json'
            }).then(function(items) {
                if (!items || items.length === 0) {
                    container.innerHTML = '<p class="emptyText">No items found matching "' + self.escapeHtml(search) + '".</p>';
                    return;
                }
                
                var html = '<table class="dataTable">';
                html += '<thead><tr>';
                html += '<th>Name</th>';
                html += '<th>Type</th>';
                html += '<th>Last Scanned</th>';
                html += '<th>Current Rating</th>';
                html += '<th>Last Change</th>';
                html += '</tr></thead>';
                html += '<tbody>';
                
                items.forEach(function(item) {
                    var typeClass = item.Type.toLowerCase();
                    var lastScanned = item.LastScanned ? self.formatDateTime(new Date(item.LastScanned)) : '—';
                    var rating = item.CurrentRating ? item.CurrentRating.toFixed(1) : '—';
                    var critic = item.CurrentCriticRating ? ' / ' + item.CurrentCriticRating.toFixed(0) + '%' : '';
                    
                    html += '<tr>';
                    html += '<td>' + self.escapeHtml(item.Name) + '</td>';
                    html += '<td><span class="type-badge ' + typeClass + '">' + item.Type + '</span></td>';
                    html += '<td>' + lastScanned + '</td>';
                    html += '<td>' + rating + critic + '</td>';
                    html += '<td>' + (item.LastChange ? self.escapeHtml(item.LastChange) : '—') + '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                
                container.innerHTML = html;
            }).catch(function(err) {
                console.error('Error searching item history:', err);
                container.innerHTML = '<p class="emptyText">Error searching item history.</p>';
            });
        }

        formatDateTime(date) {
            if (!date) return '—';
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        onPause() {
            // Clean up intervals when leaving page
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
            super.onPause();
        }
    };
});
