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

## License

Copyright 2017 IMAGINARY gGmbH

Licensed under the Apache License, Version 2.0.

See the LICENSE and NOTICE files for more details.