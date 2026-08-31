using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Playwright;

namespace DorfBuilder.App.Services
{
    public sealed class StaemmeBrowserLauncher : IDisposable
    {
        private const string StaemmeUrl = "https://www.die-staemme.de/";

        private readonly SemaphoreSlim _gate = new(1, 1);
        private IPlaywright? _playwright;
        private IBrowserContext? _context;
        private IPage? _page;

        public async Task OpenAsync()
        {
            await _gate.WaitAsync();

            try
            {
                if (_context is null)
                {
                    _playwright = await Playwright.CreateAsync();

                    var profilePath = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "DieStaemme",
                        "StaemmeBrowserProfile");

                    Directory.CreateDirectory(profilePath);

                    _context = await _playwright.Chromium.LaunchPersistentContextAsync(
                        profilePath,
                        new BrowserTypeLaunchPersistentContextOptions
                        {
                            Headless = false,
                            ViewportSize = null,
                            Args =
                            [
                                "--start-maximized"
                            ]
                        });
                }

                _page = _context.Pages.FirstOrDefault(page => !page.IsClosed)
                    ?? await _context.NewPageAsync();

                await _page.GotoAsync(
                    StaemmeUrl,
                    new PageGotoOptions
                    {
                        WaitUntil = WaitUntilState.DOMContentLoaded
                    });

                await _page.BringToFrontAsync();
            }
            finally
            {
                _gate.Release();
            }
        }

        public void Dispose()
        {
            _context?.CloseAsync().GetAwaiter().GetResult();
            _playwright?.Dispose();
            _gate.Dispose();
        }
    }
}
