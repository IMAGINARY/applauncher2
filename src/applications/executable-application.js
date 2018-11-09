/* eslint-disable global-require */
import isElectron from 'is-electron';
import Application from './application';

/**
 * Applications that are executable programs that run as child processes
 */
export default class ExecutableApplication extends Application {

  constructor(config) {
    super(config);

    const defaults = {
      args: [],
      cwd: undefined,
      env: undefined,
      shell: false,
    };

    const appConfig = Object.assign(defaults, config);
    this.args = appConfig.args;
    this.cwd = appConfig.cwd;
    this.env = appConfig.env;
    this.shell = appConfig.shell;
  }

  run(container, lang = 'en') {
    if (isElectron()) {
      try {
        // The following two requires should be included when running under electron
        // and not present when running on a regular browser.
        // They have been marked as external dependencies in the browserify configuration
        // to avoid including them when creating the application bundle.

// eslint-disable-next-line global-require,import/no-unresolved,import/no-extraneous-dependencies
        const electron = require('electron');
// eslint-disable-next-line global-require,import/no-unresolved,import/no-extraneous-dependencies
        // noinspection NodeJsCodingAssistanceForCoreModules
        const childProcess = require('child_process');
        const appProcess = childProcess.spawn(
          this.main,
          this.args,
          {
            cwd: this.cwd,
            env: Object.assign(electron.remote.process.env, { LANG: lang }, this.env),
            shell: this.shell,
            stdio: ['ignore', electron.remote.process.stdout, electron.remote.process.stderr],
          }
        );
        appProcess.on('exit', () => this.close());
        appProcess.on('error', (err) => {
          console.error(`Error launching executable application ${this.id}: ${err.message}`);
          this.close();
        });
      } catch (err) {
        console.error(`Error launching executable application ${this.id}: ${err.message}`);
        window.setTimeout(() => this.close(), 2000);
      }
    } else {
      console.error(`Executable application ${this.id} can only be launched from electron`);
      window.setTimeout(() => this.close(), 2000);
    }
  }
}
