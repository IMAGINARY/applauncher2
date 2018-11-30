/* eslint-disable global-require */
import Application from './application';
import runExecutableApp from '../helpers/run-executable-app';

/**
 * Applications that are executable programs that run as child processes
 */
export default class ExecutableApplication extends Application {

  constructor(config) {
    super(config);
    this.config = config;
  }

  run(container, lang = 'en') {
    runExecutableApp(this.config, lang)
      .then(() => {
        this.close();
      })
      .catch((err) => {
        console.error(err);
        window.setTimeout(() => this.close(), 2000);
      });
  }
}
