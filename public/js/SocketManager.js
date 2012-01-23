/* global io */
define([], function () {

	var socket = io.connect();
	return socket;
});