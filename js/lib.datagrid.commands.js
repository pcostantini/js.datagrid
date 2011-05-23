/*
 * js.luminicbox - lib.datagrid.commands.js v0.1.0 
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

// DATAGRID COMMANDS

// RowEdit command
function DataGridRowEditCommand(grid, dataItem, rowIndex, oldValues, newValues) {
	this.init();
	this.grid = grid;
	this.rowIndex = rowIndex;
	this.dataItem = dataItem;
	this.oldValues = oldValues;
	this.newValues = newValues;
}
jQuery.extend( DataGridRowEditCommand.prototype, ReversibleCommand.prototype );
DataGridRowEditCommand.prototype.mainCommit = function() {
	for(var propName in this.newValues) {
		if(typeof this.newValues[propName] != "function") this.dataItem[propName] = this.newValues[propName];
	}
	this.grid.refreshRow(this.rowIndex);
	this.grid.refreshFooter();
}
DataGridRowEditCommand.prototype.mainRollback = function() {
	for(var propName in this.oldValues) {
		if(typeof this.oldValues[propName] != "function") this.dataItem[propName] = this.oldValues[propName];
	}
	this.grid.refreshRow(this.rowIndex);
	this.grid.refreshFooter();
}

// RowAdd command
function DataGridRowAddCommand(grid, dataItem, rowIndex) {
	this.init();
	this.grid = grid;
	this.dataItem = dataItem;
	this.rowIndex = rowIndex;
}
jQuery.extend( DataGridRowAddCommand.prototype, ReversibleCommand.prototype );
DataGridRowAddCommand.prototype.mainCommit = function() {
	if(this.rowIndex != undefined) {
		this.grid.insertRow(this.dataItem, this.rowIndex);
	} else {
		this.rowIndex = this.grid.appendRow(this.dataItem);
	}
}
DataGridRowAddCommand.prototype.mainRollback = function() {
	this.grid.removeRow(this.rowIndex);
}

// RowDelete command
function DataGridRowDeleteCommand(grid, rowIndex) {
	this.init();
	this.grid = grid;
	this.rowIndex = rowIndex;
	this.dataItem = grid.model[rowIndex];
}
jQuery.extend( DataGridRowDeleteCommand.prototype, ReversibleCommand.prototype );
DataGridRowDeleteCommand.prototype.mainCommit = function() {
	this.grid.removeRow(this.rowIndex);
}
DataGridRowDeleteCommand.prototype.mainRollback = function() {
	this.grid.insertRow(this.dataItem, this.rowIndex);
}



/*
 * Changelog
 *
 * 28/05/2008:
 *  - migrated to jQuery 1.2.5 (wip)
 *  
 * 04/10/2006:
 *	- DataGridRowEditCommand
 *	- DataGridRowAddCommand
 *	- DataGridRowDeleteCommand
 * 20/10/2006:
 *	- DataGridRowEditCommand refreshes footer
 */