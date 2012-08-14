define([
	'jquery', 'ProjectView', 'util', 'omegaEvent'
],
function ($, ProjectView, util, OmegaEvent) {
	
describe("omega", function () {

	var name = {};
	var messageInput = {};
	var form = {};
	var messagesElement = {
		get: function () { return window; }
	};
	var socket = {
		on: function () {},
		emit: function () {}
	};

	// server version
	function fakeIssue(id, description, creator) {
		return {
			id: id || 1,
			description: description || 'test issue',
			creator: creator || 'bob'
		};
	}

	var tracker;

	beforeEach(function () {
		tracker = new ProjectView(name, messageInput, messagesElement, socket);
		tracker.userManager.current("norris");
		tracker.userManager.loggedIn(true);
	});
	
	describe("message list", function () {
		var omegaEvents = [
			new OmegaEvent(OmegaEvent.Type.NewIssue, { issue: fakeIssue(1, 'first test') }),
			new OmegaEvent(OmegaEvent.Type.AssignIssue, { issue: fakeIssue(), assigner: 'fred' }),
			new OmegaEvent(OmegaEvent.Type.NewIssue, { issue: fakeIssue(), updater: 'fred' })
		];

		it("shows history upon connection", function () {
			tracker.messageList.processHistory(omegaEvents);
			expect(tracker.messageList.messages().length).toBe(3);
			expect(tracker.messageList.messages()[0].message).toEqual('bob created <a class="id" data-id="1" href="#1">Ω1</a>.');
		});
		
		it("shows consistent history by overwriting existing messages", function () {
			tracker.messageList.messages([{msg: 'foo'}, {msg: 'bar'}]);

			tracker.messageList.processHistory(omegaEvents);
			expect(tracker.messageList.messages().length).toBe(3);
			expect(tracker.messageList.messages()[0].message).toEqual('bob created <a class="id" data-id="1" href="#1">Ω1</a>.');
		});

		it("adds flavour when appropriate", function () {
			var closeEvent = new OmegaEvent(OmegaEvent.Type.CloseIssue, { issue: fakeIssue() });
			closeEvent.timestamp = 123;

			var assignEvent = new OmegaEvent(OmegaEvent.Type.AssignIssue, { issue: fakeIssue(), assigner: 'fred' });
			assignEvent.timestamp = 123;

			tracker.messageList.append(closeEvent);
			tracker.messageList.append(assignEvent);

			var flavour = /Die issues, die!/;
			var closeMessage = tracker.messageList.messages()[0].message;
			expect(closeMessage).toMatch(flavour);

			var assignMessage = tracker.messageList.messages()[1].message;
			expect(assignMessage).not.toMatch(flavour);
		});
	});

	describe("handles login", function () {
		it("accepts valid names", function () {
			name.val = function () { return "norris"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			expect(socket.emit.mostRecentCall.args[0]).toBe('login user');
			expect(socket.emit.mostRecentCall.args[1]).toBe('norris');
		});
		it("rejects empty name", function () {
			name.val = function () { return ""; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.userManager.invalidName()).toBe(true);
		});
		it("rejects short names", function () {
			name.val = function () { return "yo"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).wasNotCalled();
			expect(tracker.userManager.invalidName()).toBe(true);
		});
		it("rejects reserved names", function () {
			name.val = function () { return "nobody"; };
			tracker.userManager.current(undefined);

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalled();
			var callback = socket.emit.mostRecentCall.args[2];
			expect(tracker.userManager.invalidName()).toBe(false);
			callback(true); // server says invalid
			expect(tracker.userManager.invalidName()).toBe(true);
		});
	});

	describe("parses commands", function () {

		it("can view help", function () {
			messageInput.val = function () { return "/help"; };
			messageInput.focus = function () {};

			tracker.handleInput();
			expect(tracker.helpOpen()).toEqual(true);
		});

		it("can chat", function () {
			messageInput.val = function () { return "hello peeps"; };

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalledWith('user message', 'hello peeps');
		});

		it("can emote", function () {
			messageInput.val = function () { return ":)"; };

			spyOn(socket, 'emit');
			tracker.handleInput();
			expect(socket.emit).toHaveBeenCalledWith('user message', ':)');
		});

		it("can create issues", function () {
			messageInput.val = function () { return "/create new issue"; };

			spyOn(tracker.issueManager, 'createIssue');
			tracker.handleInput();
			expect(tracker.issueManager.createIssue).toHaveBeenCalledWith("new issue");
		});

		it("mixed case and unicode works", function () {
			messageInput.val = function () { return "/CREATE Ω=aw3som#"; };

			spyOn(tracker.issueManager, 'createIssue');
			tracker.handleInput();
			expect(tracker.issueManager.createIssue).toHaveBeenCalledWith("Ω=aw3som#");
		});

		it ("can prioritize issues", function () {
			messageInput.val = function () { return "/star 5"; };

			spyOn(tracker.issueManager, 'prioritizeIssue');
			tracker.handleInput();
			expect(tracker.issueManager.prioritizeIssue).toHaveBeenCalledWith(5);
		});

		it ("can tag issues", function () {
			messageInput.val = function () { return "/tag 5 later"; };

			spyOn(tracker.issueManager, 'tagIssue');
			tracker.handleInput();
			expect(tracker.issueManager.tagIssue).toHaveBeenCalledWith(5, 'later');
		});
		
		it("can assign multi-digit issues", function () {
			messageInput.val = function () { return "/assign 50"; };
		
			spyOn(tracker.issueManager, 'assignIssue');
			tracker.handleInput();
			expect(tracker.issueManager.assignIssue).toHaveBeenCalledWith(50, undefined);
		});
		
		describe("handles invalid input", function () {

			it("bad command", function () {
				messageInput.val = function () { return "/fluffernutter"; };

				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});

			it("create no args", function () {
				messageInput.val = function () { return "/create"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("create whitespace only", function () {
				messageInput.val = function () { return "/create  "; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign no args", function () {
				messageInput.val = function () { return "/assign"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("assign bad id", function () {
				messageInput.val = function () { return "/assign this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical no args", function () {
				messageInput.val = function () { return "/critical"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("critical bad id", function () {
				messageInput.val = function () { return "/critical this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit no args", function () {
				messageInput.val = function () { return "/edit"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("edit bad id", function () {
				messageInput.val = function () { return "/edit not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close no args", function () {
				messageInput.val = function () { return "/close"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("close bad id", function () {
				messageInput.val = function () { return "/close this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen no args", function () {
				messageInput.val = function () { return "/reopen"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
			
			it("reopen bad id", function () {
				messageInput.val = function () { return "/reopen this is not an id"; };
				
				spyOn(tracker, 'notifyOfBadCommand');
				tracker.handleInput();
				expect(tracker.notifyOfBadCommand).toHaveBeenCalled();
			});
		});
	});
	
});

});