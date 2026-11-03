using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace RatingSync {
    // A streaming disk index bounds memory even for very large IMDb datasets.
    internal static class EpisodeIndex {
        private static readonly SemaphoreSlim Gate = new SemaphoreSlim(1, 1);
        private static string generation;
        private static readonly Dictionary<string, Dictionary<string, string>> Cache = new Dictionary<string, Dictionary<string, string>>();
        private static int Bucket(string parent) {
            uint hash = 2166136261;
            foreach (char ch in parent) hash = unchecked((hash ^ ch) * 16777619);
            return (int)(hash % 128);
        }
        internal static async Task<string> Find(string path, string parent, int season, int episode, CancellationToken token) {
            await Gate.WaitAsync(token).ConfigureAwait(false);
            try {
                return await Task.Run(() => {
                    var info = new FileInfo(path);
                    var index = path + ".index-" + info.LastWriteTimeUtc.Ticks + "-" + info.Length;
                    if (!Directory.Exists(index)) Build(path, index, token);
                    if (generation != index) {
                        Cache.Clear(); generation = index;
                        // Retain the current and previous generated index only.
                        var prefix = Path.GetFileName(path) + ".index-";
                        var old = System.Linq.Enumerable.OrderByDescending(Directory.GetDirectories(Path.GetDirectoryName(path), prefix + "*"), Directory.GetLastWriteTimeUtc);
                        foreach (var candidate in System.Linq.Enumerable.Skip(old, 2)) {
                            var suffix = Path.GetFileName(candidate).Substring(prefix.Length);
                            if (System.Text.RegularExpressions.Regex.IsMatch(suffix, @"^\d+-\d+$") && candidate != index) {
                                try { Directory.Delete(candidate, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
                            }
                        }
                    }
                    if (!Cache.TryGetValue(parent, out var episodes)) {
                        episodes = new Dictionary<string, string>();
                        foreach (var line in File.ReadLines(Path.Combine(index, Bucket(parent) + ".tsv"))) {
                            token.ThrowIfCancellationRequested();
                            var fields = line.Split('\t');
                            if (fields.Length == 4 && fields[1] == parent) episodes[fields[2] + "|" + fields[3]] = fields[0];
                        }
                        if (Cache.Count >= 512) Cache.Clear();
                        Cache[parent] = episodes; // Cache misses too; don't reread for each missing episode.
                    }
                    return episodes.TryGetValue(season + "|" + episode, out var id) ? id : null;
                }, token).ConfigureAwait(false);
            } finally { Gate.Release(); }
        }
        private static void Build(string source, string index, CancellationToken token) {
            var temp = index + "." + Guid.NewGuid().ToString("N") + ".tmp";
            Directory.CreateDirectory(temp);
            var writers = new StreamWriter[128];
            try {
                try {
                    for (int i = 0; i < writers.Length; i++) writers[i] = new StreamWriter(Path.Combine(temp, i + ".tsv"));
                    foreach (var line in File.ReadLines(source)) {
                        token.ThrowIfCancellationRequested();
                        var fields = line.Split('\t');
                        if (fields.Length == 4 && fields[1].StartsWith("tt", StringComparison.Ordinal))
                            writers[Bucket(fields[1])].WriteLine(line);
                    }
                } finally { foreach (var writer in writers) writer?.Dispose(); }
                Directory.Move(temp, index);
            } finally { if (Directory.Exists(temp)) Directory.Delete(temp, true); }
        }
    }
}
