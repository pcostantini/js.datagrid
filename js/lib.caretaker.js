/*
 * js.luminicbox - lib.caretaker.js v0.1.0 
 *
 * Copyright (c) 2006-2009 - Pablo Costantini (luminicbox.com)
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 */

// MEMENTO CARETAKER
function MementoCaretaker() {
	this._history = new Array();
	this._index = -1;
	this.onChange = function() {}
	this.onUndo = function() {}
	this.onRedo = function() {}
}
MementoCaretaker.prototype.reset = function() {
	this._history = new Array();
	this._index = -1;
	this.onChange(this._index, (this._history.length-1)-this._index);
}
MementoCaretaker.prototype.undo = function() {
	if(this._index == -1) return;
	//this.onUndo(this.getCurrentMemento().memento1);
	this._index--;
	this.onUndo(this.getCurrentMemento());
	this.onChange(this._index, (this._history.length-1)-this._index);
}
MementoCaretaker.prototype.redo = function() {
	if(this._index == this._history.length-1) return;
	this._index++;
	this.onRedo(this.getCurrentMemento());
	this.onChange(this._index, (this._history.length-1)-this._index);
}
MementoCaretaker.prototype.getCurrentMemento = function() {
	return this._history[this._index];
}
MementoCaretaker.prototype.push = function(memento) {
	var j = this._index;
	this._history.splice(j+1,this._history.length-j, memento );
	this._index = this._history.length-1;
	this.onChange(this._index, (this._history.length-1)-this._index);
}


// COMMAND CARETAKER
function CommandCaretaker() {
	this._index = -1;
	this._history = new Array();
	this.onChange = function() { }
	this.onUndo = function() { }
	this.onRedo = function() { }
	$(window).unload(this.reset.toEvent(this));
}
CommandCaretaker.prototype.reset = function() {
	this._index = -1;
	this._history = new Array();
	this.onChange(this._index+1, (this._history.length-1)-this._index);
}
CommandCaretaker.prototype.pushCommand = function(cmd) {
	// TODO: check for type
	this._index++;
	this._history[this._index] = cmd;
	this._history.splice(this._index+1);
	this.onChange(this._index+1, (this._history.length-1)-this._index);
}
CommandCaretaker.prototype.undo = function() {
	if(this._index == -1) return;
	var cmd = this._history[this._index];
	cmd.rollback();
	this._index--;
	this.onUndo(cmd);
	this.onChange(this._index+1, (this._history.length-1)-this._index);
}
CommandCaretaker.prototype.redo = function() {
	if(this._index == this._history.length-1) return;
	var cmd = this._history[this._index+1];
	cmd.commit();
	this._index++;
	this.onRedo(cmd);
	this.onChange(this._index+1, (this._history.length-1)-this._index);
}

// REVERSIBLE COMMAND (Base Class)
function ReversibleCommand() { }
ReversibleCommand.prototype.init = function() {
	this._executed = false;
}
ReversibleCommand.prototype.commit = function() {
	if(!this._executed) {
		this.mainCommit();
		this._executed = true;
	}
}
ReversibleCommand.prototype.rollback = function() {
	if(this._executed) {
		this.mainRollback();
		this._executed = false;
	}
}

// SERIAL COMMAND
function SerialCommand() {
	this.init();
	this._closed = false;
	this._cmds = new Array();
}
jQuery.extend(SerialCommand.prototype, ReversibleCommand.prototype);
SerialCommand.prototype.addCommand = function(cmd) {
	// TODO: check for type
	if(this._closed) alert("ERROR: This SerialCommand is already closed.");
	this._cmds.push(cmd);
}
SerialCommand.prototype.mainCommit = function() {
	this._closed = true;
	for(var i=0; i<this._cmds.length; i++) {
		this._cmds[i].commit();
	}
}
SerialCommand.prototype.mainRollback = function() {
	for(var i=(this._cmds.length-1); i>=0; i--) {
		this._cmds[i].rollback();
	}
}

/*
 * Changelog
 *
 * 28/05/2008:
 *  - migrated to jQuery 1.2.5 (wip)
 */