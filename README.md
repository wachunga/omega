Omega Issue Tracker
===

Traditional issue trackers emphasize metadata and workflow and tend to add considerable overhead to a project. They make little sense for small, highly collaborative teams.

Ω is not traditional. It facilitates squashing issues, not documenting their life stories. No administrivia. No bloat.

Features
---

* real-time
    * issues created and closed right before your eyes; you **never need to refresh**
    * **chat** with team members in the same context
    * optional growl-like **notifications** even outside the browser (Chrome only until browser support improves)

* minimalist
    * single page
    * workflow: open, assign, close
    * priority: critical or not
    * if you need metadata, like component or severity, just include it in the description


Installation
---

Install [node.js](https://github.com/joyent/node) and [npm](https://github.com/isaacs/npm).

Get required dependencies:

    npm install socket.io
    npm install underscore
    npm install node-static


Usage
---

Start the server:

    node server.js [port] [file]

(`port` defaults to `1337`; `file`, which determines where issues are persisted, defaults to `issues`)

Then just open a browser to http://localhost:1337 or wherever.

Testing
---

Omega is unit tested using [Jasmine](https://github.com/pivotal/jasmine). Open `tests/SpecRunner.html` to run the tests.

History
---

Ω's development was motivated by dissatisfaction with JIRA for tracking issues during new development. It began as a chat room with a human-managed issues list. When that actually proved useful, we decided it was worth coding up. The first version was created during a Big Idea Day at [Pulse Energy](http://www.pulseenergy.com) and it's still in active use there.