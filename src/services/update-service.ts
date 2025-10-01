import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export class UpdateService {
  private static isChecking = false;
  private static updateInProgress = false;

  static isUpdateInProgress(): boolean {
    return this.updateInProgress;
  }

  static async checkForUpdates(silent: boolean = false): Promise<void> {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.updateInProgress = true;

    try {
      console.log('Checking for updates...');
      const update = await check();
      console.log('Update check result:', update);

      if (update?.available) {
        const yes = await ask(
          `Version ${update.version} is available!\n\nCurrent version: ${update.currentVersion}\n\nWould you like to download and install it now?`,
          {
            title: 'Update Available',
            kind: 'info',
          }
        );

        if (yes) {
          console.log('Starting download and install...');

          try {
            // Download and install happens in the background
            await update.downloadAndInstall();

            console.log('Download and install complete');

            const relaunchNow = await ask(
              'Update installed successfully! Restart now?',
              {
                title: 'Update Complete',
                kind: 'info',
              }
            );

            if (relaunchNow) {
              await relaunch();
            }
          } catch (downloadError) {
            console.error('Download/install failed:', downloadError);
            await message(`Failed to install update: ${downloadError}`, {
              title: 'Update Error',
              kind: 'error',
            });
          }
        }
      } else if (!silent) {
        await message('You are running the latest version!', {
          title: 'No Updates',
          kind: 'info',
        });
      }
    } catch (error) {
      // Always log errors, even in silent mode
      console.error('Failed to check for updates:', error);

      // Only show dialog if not silent
      if (!silent) {
        await message(`Failed to check for updates: ${error}`, {
          title: 'Update Error',
          kind: 'error',
        });
      }
    } finally {
      this.isChecking = false;
      this.updateInProgress = false;
    }
  }

  static async checkOnStartup(): Promise<void> {
    // Check for updates silently on startup (wait 3 seconds to not interfere with app launch)
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 3000);
  }
}
