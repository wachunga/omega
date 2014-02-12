Omega Issue Tracker
===

Traditional issue trackers emphasize metadata and workflow and tend to add considerable overhead to a project. They make little sense for small, highly collaborative teams.

Ω is not traditional. It facilitates squashing issues, not documenting their life stories. No administrivia.

Initial version created during a Big Idea Day at [Pulse Energy](http://www.pulseenergy.com). [More details](http://hirtopolis.wordpress.com/2012/08/16/instant-issue-tracking/)

Demo
---

Our earlier host, Nodester, has caved. Heroku replacement coming soon.

Features
---

* real-time
    * you **never need to refresh** to get updates 
    * **chat** with team members in the same context
    * optional growl-like **notifications** even outside the browser (Chrome only, [for now](http://caniuse.com/#feat=notifications))

* minimalist
    * everything you need on a single page
    * no need to sign up for yet another account with yet another password
    * use tags and flexible filtering to achieve any workflow you want
    * easy setup thanks to few dependencies

* projects
    * create as many as you need (one per task/feature works well)
    * can mark 'top secret' if you want some privacy (for total security, host Ω behind your firewall)

Installation
---

Depending on your needs, you could create your project on <omegatracker.nodester.com>. But to have Ω all to yourself, there are a couple of options:

1. Install it on your own server

    Install [node.js](http://nodejs.org) (which comes with npm) and run `npm install omega -g`.

2. Install it in the cloud via a PaaS like heroku, openshift, etc.


Usage
---

Start the server:

    omega [--port <port>] [--pass <password>]

`<port>` - Where the server listens for connections. Defaults to 1337.

`<password>` - Password required for accessing project admin section. Defaults to 'admin'. (Default username is also 'admin'.)

Then just open a browser to http://localhost:1337 or wherever.

Tests
---

Ω is unit tested using [Jasmine](https://github.com/pivotal/jasmine). Open `tests/SpecRunner.html` to run the tests.

Contributors
---

```
 project: omega
 commits: 254
 files  : 105
 authors: 
   221  David Hirtle            87.0%
    24  Neil Gentleman          9.4%
     6  Drew Miller             2.4%
     2  Russell Porter          0.8%
     1  Farrin Reid             0.4%
```

Bugs
---

Our dev instance of Ω is not public (for now), but feel free to file issues on [github](https://github.com/wachunga/omega/issues) as usual.
