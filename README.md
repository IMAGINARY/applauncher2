# IMAGINARY AppLauncher Mark II

A graphic menu for launching applications based on HTML technologies. This is a rewrite of the 
[IMAGINARY Application launcher](https://github.com/IMAGINARY/applauncher).

## Philosophy

Why a rewrite? As of May 2017 we need a launcher to launch HTML apps in an IFRAME (or similar)
that supports a large number of applications and is translatable. The applauncher currently 
supports 4-5 "real" (executable) applications, is not configurable or translatable, and the 
project depends on electron. It's also programmed in old fashioned JS instead of ES6/ES2015 
or some other modern (hipster) version.

... The idea was for applauncher to eventually be configurable and translatable, but visually it's
too tied to the small number of apps it launched, so there wouldn't be too much code reuse. It's
easier now to do a whole new launcher with the goal of eventually fully replacing the applauncher
(by adding the ability to launch programs instead of HTML apps)... or later combining both in a 
perfect AppLauncher Mark III.

## Goals

- Configurable (without recompiling)
- Translatable (without recompiling)
- Resolution-independent
- Independent from electron, so it can run there, in a standard browser, tablets, etc.
 
It should aim towards very clean layering:

- Browser
- AppLauncher core (API, Services, Configuration)
- AppLauncher i18n
- AppLauncher layout (visual layout)
- AppLauncher theme (light on dark background, dark on light, etc.)
- Applications

The browser itself and the applications are out of the scope of this project. Facilities for integrating the three
parts might be given in a separate repository, document, etc.

## Installation

Just make the root directory accesible with a web server. You should also configure it... if you have no plans
to configure this program then it's not the one you want.  

## Configuration

The configuration file is at cfg/config.yml. It is fully commented so it documents its own format. 

The default configuration provided is for demo purposes and offers a number of CindyJS applications found
in the internet. A sample configuration that accesses the apps locally is also provided 
(`sample-local-cindy.config.yml`).

## Applications

Applications are added to the AppLauncher by indicating the paths where they're installed in the config file.
The indicated path should contain:

- An `app.json` file that describes the application
- An `icons/icon.png` file with a large icon image (1000x1000 is recommended, see `docs/icon template.psd`)
- Optionally it can contain other files required to run the app
  
### app.json

The app.json should contain the following keys:

- **id**: The unique machine name of the application (lowercase letters, numbers, underscore, dash)

- **version**: Version identifier, parseable by node-semver (`https://github.com/npm/node-semver`). You can 
simply use the x.y.z format (e.g. `1.0.0`).

- **name**: The human readable name of the application that will be displayed in the menu. A single string
can be specified or an object where each key is a language code and it maps to a translated name. A default
name in english (`en`) should always be provided. 

- **description**: (Optional) Description text of the application. It's currently not being displayed but might be in the
future. A single string can be specified or an object where each key is a language code and it maps to a
translated description. A default description in english (`en`) should always be provided. 

- **root**: (Optional) Path of the root directory where the application's files are installed. The icon file and the `main`
file should be placed in this directory.
 
- **main**: File that should be opened to launch the application. (e.g. `index.html`) It can be a path or an
absolute url. If `root` was specified this value will be interpreted relative to that.

- **width**, **height**: (Optional) Native resolution of the app. If specified the app will be run at this 
resolution and zoomed (in or out) to fit into the window. If not specified the app will run at the resolution
of the frame where it's launched (which might be very small, very large, or change during execution).

## Compilation


This app is built using several compilable languages:

- The HTML pages are built from **pug** template files.
- The CSS stylesheet is pre-compiled from **sass** files.
- The JS scripts are trans-compiled from **es6** (ES2015) files. 

To make any modifications re-compilation is necessary. You should install:

- **node** and **npm**
- **yarn**
- **gulp** (install globally)

Afterwards run the following in the command line:

```
yarn
```

After it runs succesfuly you can compile as needed:

- **sass (stylesheets)**
  ```
    gulp sass
  ```

- **scripts (ES6)**
  ```
    gulp scripts:prod
  ```
  
- **scripts (ES6, debug)**
  ```
    gulp scripts:dev
  ```

## License

Copyright 2017 IMAGINARY gGmbH

Licensed under the Apache License, Version 2.0.

See the LICENSE and NOTICE files for more details.