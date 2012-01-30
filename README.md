Omega Issue Tracker
===

Traditional issue trackers emphasize metadata and workflow and tend to add considerable overhead to a project. They make little sense for small, highly collaborative teams.

Ω is not traditional. It facilitates squashing issues, not documenting their life stories. No administrivia. No bloat.

Initial version created during a Big Idea Day at [Pulse Energy](http://www.pulseenergy.com), where it is actively being used.

Features
---

* real-time
    * you **never need to refresh** to get updates 
    * **chat** with team members in the same context
    * optional growl-like **notifications** even outside the browser (only supported in Chrome for now)

* minimalist
    * single page
    * workflow: open, assign, close
    * priority: critical or not
    * if you need metadata, like component or severity, just include it in the description

To avoid bloat, new features are added reluctantly. One thing that is likely to be added is support for multiple projects. 

Installation
---

Install [node.js](https://github.com/joyent/node), clone this repo, and then `npm install` from that directory.

Usage
---

Start the server:

    node server.js [-p <port>] [-db <file>]

`<port>` - Where the server listens for connections. Defaults to 1337.

`<file>` - Where issues are persisted as json. Defaults to "issues".

Then just open a browser to http://localhost:1337 or wherever.

Testing
---

Ω is unit tested using [Jasmine](https://github.com/pivotal/jasmine). Open `tests/SpecRunner.html` to run the tests.
