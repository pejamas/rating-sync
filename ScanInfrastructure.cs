using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Net;
using MediaBrowser.Model.Services;

namespace RatingSync {
    [Route("/RatingSync/Start", "POST")]
    [Authenticated(Roles = "Admin")]
    public class StartScanRequest : RunSelectedRequest, IReturn<StartScanResponse> {
        public bool FullLibrary { get; set; }
    }
    public class StartScanResponse {
        public string JobId { get; set; }
        public string TaskId { get; set; }
        public string State { get; set; }
    }
    public class RatingChange {
        public string Rating { get; set; }
        public float? Before { get; set; }
        public float After { get; set; }
        public string Source { get; set; }
    }
    internal static class AtomicStorage {
        internal static void Write(string path, Action<Stream> write) {
            var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try {
                using (var file = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None)) {
                    write(file);
                    file.Flush(true);
                }
                if (File.Exists(path)) File.Replace(temp, path, null);
                else File.Move(temp, path);
            } finally { if (File.Exists(temp)) File.Delete(temp); }
        }
    }
    internal sealed class ProviderQuotaException : Exception { }
    internal sealed class RequestPacer {
        private readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
        private DateTime next = DateTime.MinValue;
        internal async Task Wait(CancellationToken token) {
            await gate.WaitAsync(token).ConfigureAwait(false);
            try {
                var delay = next - DateTime.UtcNow;
                if (delay > TimeSpan.Zero) await Task.Delay(delay, token).ConfigureAwait(false);
                next = DateTime.UtcNow.AddSeconds(1);
            } finally { gate.Release(); }
        }
    }
}
