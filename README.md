Omega Issue Tracker
===

Traditional issue trackers emphasize metadata and workflow and tend to add considerable overhead to a project. They make little sense for small, highly collaborative teams.

Ω is not traditional. It facilitates squashing issues, not documenting their life stories. No administrivia.

Initial version created during a Big Idea Day at [Pulse Energy](http://www.pulseenergy.com), where it is actively being used.

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

2. Install it in the cloud via a PaaS like nodester, heroku, openshift, etc.

    [Nodester](http://nodester.com/) is the easiest route, and it's free. Process is roughly as follows:
    * request a coupon, install the CLI, etc
    * `nodester app create myomega`
    * `git clone git@github.com:wachunga/omega.git`
    * `git remote set-url nodester git@nodester.com:/node/git/<your_details_here>.git`
    * `git push nodester master`
    * install required dependencies: `nodester npm install myomega`
    * set the NODE_ENV: `curl -X PUT -u "<user>:<pass>" -d "appname=myomega&key=NODE_ENV&value=nodester" http://api.nodester.com/env`


Usage
---

Start the server:

    omega [-port <port>] [-pass <password>]

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
 commits: 230
 files  : 102
 authors: 
   207  David Hirtle            90.0%
    15   Neil Gentleman          6.5%
     6	Drew Miller             2.6%
     1	Farrin Reid             0.4%
     1	Russell Porter          0.4%
```

Bugs
---

Our dev instance of Ω is not public (for now), but feel free to file issues on [github](https://github.com/wachunga/omega/issues) as usual.
