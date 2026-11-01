using System;
using System.Collections.Generic;
using System.Globalization;

namespace RatingSync
{
    /// <summary>
    /// Server-side localization.
    ///
    /// Scope is deliberately narrow: only strings that Emby renders directly and
    /// that the front-end cannot translate, i.e. plugin metadata, the scheduled
    /// task name/description, and the dashboard page title. Everything inside the
    /// configuration page is localized in Configuration/configPage.js.
    ///
    /// Scan detail strings (see RatingRefreshTask) are intentionally left in
    /// English: they are persisted in scan_history.json and matched with indexOf
    /// by the report / missing-data filters, so they act as canonical codes. The
    /// front-end translates them for display (localizeDetail).
    /// </summary>
    public static class Strings
    {
        private static readonly Dictionary<string, string> Zh = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            { "plugin.name", "评分同步" },
            { "plugin.description", "从 IMDb 与烂番茄刷新社区评分和影评人评分" },
            { "page.displayName", "评分同步" },
            { "task.name", "刷新 IMDb 与烂番茄评分" },
            { "task.description", "使用 IMDb 更新社区评分，使用烂番茄更新影评人评分" }
        };

        private static readonly Dictionary<string, string> En = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            { "plugin.name", "Rating Sync" },
            { "plugin.description", "Refreshes community and critic ratings from IMDb and Rotten Tomatoes" },
            { "page.displayName", "Rating Sync" },
            { "task.name", "Refresh IMDb and Rotten Tomatoes Ratings" },
            { "task.description", "Updates community ratings from IMDb and critic ratings from Rotten Tomatoes" }
        };

        /// <summary>Chinese when the server UI culture is Chinese, English otherwise.</summary>
        public static bool IsChinese
        {
            get
            {
                try
                {
                    return string.Equals(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName, "zh", StringComparison.OrdinalIgnoreCase);
                }
                catch
                {
                    return false;
                }
            }
        }

        public static string T(string key)
        {
            string value;
            var table = IsChinese ? Zh : En;
            if (table.TryGetValue(key, out value))
                return value;
            if (En.TryGetValue(key, out value))
                return value;
            return key;
        }
    }
}
