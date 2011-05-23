/*
 * js.luminicbox - lib.datagrid.js v0.1.1
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

/*

JS.DataGrid

Properties:
- schema
- model
- selectedRow
- container
- table
- thead
- tbody
- subGrids
	
Methods:
- CONSTRUCTOR(container, schema, model, buildHeader)
- getRows():tr[]
- appendRow(dataItem)
- insertRow(dataItem, rowIndex)
- removeRow(rowIndex)
- refreshRow(rowIndex)
- editRow(rowIndex, [colIndex])
- commitEdit()
- cancelEdit()
- setSort(colIndex, direction)
- getSort():{colIndex, sortDirection}
- refresh()
		
	
Events:
- created(e, grid)
- row_created(e, {grid, rowIndex, dataItem})
- row_rollover(e, {grid, rowIndex, colIndex, dataItem})
- row_rollout(e, {grid, rowIndex, colIndex, dataItem})
- row_click(e, {grid, rowIndex, coldIndex, dataItem});
- row_edit(e, {grid, rowIndex, colIndex, dataItem})
- row_update_failed(e, {grid, rowIndex, oldValues, newValues, dataItem})
- row_updating(e, {grid, rowIndex, oldValues, newValues, dataItem, cancel})
- row_updated(e, {grid, rowIndex, oldValues, newValues, dataItem})
- row_edit_cancel(e, {grid, rowIndex, dataItem})
- row_command(e, {grid, commandName, rowIndex, dataItem})
- sort_request(e, {grid, colIndex, sortBy, sortDirection})
- subgrid_created(e, {grid, subgrid})
- footer_created
	
*/

DataGrid = function(container, schema, model, buildHeader) {
    this.buildHeader = buildHeader;
    this.schema = schema;
    this.model = model;
    this.container = container;
    this.table = null;
    this.thead = null;
    this.tbody = null;
    this.selectedRow = null;
    this.subGrids = [];
    this.collapsedColumns = [];
    this.events = $("<a></a>");
    // event listeners
    this.eventHandlers = {
        document_mouseup: this.document_mouseup.toEvent(this),
        grid_td_rollover: this.grid_td_rollover.toEvent(this),
        grid_td_rollout: this.grid_td_rollout.toEvent(this),
        grid_td_click: this.grid_td_click.toEvent(this),
        grid_input_keypress: this.grid_input_keypress.toEvent(this),
        grid_td_command: this.grid_td_command.toEvent(this),
        grid_th_click: this.grid_th_click.toEvent(this),
        subgrid_created: this.subgrid_created.toEvent(this),
        subgrid_rowedit: this.subgrid_rowedit.toEvent(this),
        subgrid_rowedit_request: this.subgrid_rowedit_request.toEvent(this),
        grid_specialField_focus: this.grid_specialField_focus.toEvent(this),
        grid_specialField_blur: this.grid_specialField_blur.toEvent(this)
    };
}

// validation enumeration
DataGrid.Validation = new Object();
DataGrid.Validation.REQUIRED = 1;
DataGrid.Validation.NUMERIC = 2;
DataGrid.Validation.PERCENTAGE = 4;
DataGrid.Validation.ALPHA = 8;
DataGrid.Validation.ALPHANUMERIC = 16;
DataGrid.Validation.DATE = 32;
DataGrid.Validation.EMAIL = 64;
DataGrid.Validation.URL = 128;

// constructor
DataGrid.prototype.init = function() {

    // table
    this.table = document.createElement("table");
    this.table.className = "grid";
    // schema
    for (var i = 0; i < this.schema.length; i++) this.collapsedColumns[i] = false;
    // header
    if (this.buildHeader) this.createHeader(this.table, this.schema);
    // body
    if (this.tbody == null) {
        this.tbody = document.createElement("tbody");
        this.table.appendChild(this.tbody);
    }
    for (var i = 0; i < this.model.length; i++)
        this.createRow(this.model[i], i);
    // footer
    this.refreshFooter();
    // hook to document events
    // $(document).bind("mouseup", this.eventHandlers.document_mouseup);
    // add table to container
    this.container.appendChild(this.table);
    this.events.trigger("created", { grid: this });
}

// returns a collection with the rows (TRs)
DataGrid.prototype.getRows = function() {
    return this.tbody.childNodes;
}

//refresh contents of grid
DataGrid.prototype.refresh = function() {
    $(this.container).empty();
    this.table = null;
    this.thead = null;
    this.tbody = null;
    this.tfoot = null;
    this.subGrids = new Array();
    this.inited = false;
    this.init();
}

// appends a dataItem to the model and creates the row
DataGrid.prototype.appendRow = function(dataItem) {
    var ix = this.model.length;
    this.insertRow(dataItem, ix);
    return ix;
}

// inserts a dataItem at the specified position to the model and creates the row
DataGrid.prototype.insertRow = function(dataItem, rowIx) {
    // add item
    if (rowIx >= this.model.length) {
        // last
        rowIx = this.model.length;
        this.model.push(dataItem);
    } else {
        // between
        this.model.splice(rowIx, 0, dataItem);
    }
    this.createRow(dataItem, rowIx);
    this.refreshFooter();
    return rowIx;
}

// removes a dataItem from the specified position from the model and removes the row
DataGrid.prototype.removeRow = function(rowIx) {
    var dataItem = this.model[rowIx];
    this.model.splice(rowIx, 1);
    var tr = this.tbody.childNodes[rowIx];
    if (this.selectedRow == tr) this.selectedRow = null;
    this.tbody.removeChild(tr);
    this.refreshFooter();
    return dataItem;
}

// refreshes a row and its contents
DataGrid.prototype.refreshRow = function(tr) {
    if (!isNaN(tr)) tr = this.tbody.childNodes[tr];
    $(tr).empty();
    var dataItem = this.model[this.findRowIndex(tr)];
    this.createRowCells(tr, dataItem);
}

// edits a row and focus on the selected cell
DataGrid.prototype.editRow = function(tr, colIndex) {
    if (!isNaN(tr)) tr = this.tbody.childNodes[tr];
    var $tr = $(tr);
    if (this.selectedRow == tr) {
        // same row, focus on td
        var input = tr.childNodes[colIndex].childNodes[0];
        if (input && !input.hasFocus) {
            if (input.focus) input.focus();
            if (input.select) input.select();
            if (!tr.childNodes[colIndex].datePickerCtrl) this.selectedRow.cancelDocumentClick = false;
        }
        return;
    }
    // commit edit from any subgrids
    for (var i = 0; i < this.subGrids.length; i++) {
        if (!this.subGrids[i].commitEdit()) return;
        this.subGrids[i].cancelEdit();
    }
    // commit edit for current grid
    if (!this.commitEdit()) return;
    this.cancelEdit();
    // set selected row
    this.selectedRow = tr;
    $tr.removeClass("over").addClass("selected");
    if (colIndex == undefined || colIndex == null) colIndex = 0;
    var rowIndex = this.findRowIndex(tr);
    var dataItem = this.model[rowIndex];
    for (var i = 0; i < tr.childNodes.length; i++) {
        var td = tr.childNodes[i];
        var colSchema = this.schema[i];
        if (colSchema.editable) {
            // editable item
            $(td).empty();
            td.cancelClick = false;
            var input = null;
            if (colSchema.type == "boolean") {
                // checkbox
                input = this.appendCellCheckBox(td, colSchema, dataItem[colSchema.propertyName]);
            } else if (colSchema.options) {
                // select
                input = this.appendCellSelectBox(td, colSchema, dataItem[colSchema.propertyName]);
            } else {
                // textbox
                input = this.appendCellEditbox(td, colSchema, dataItem[colSchema.propertyName]);
            }
            if (input != null && colIndex == i) {
                // focus
                if (input.select) input.select();
                if (input.focus) input.focus();
            }
        }
    }
    $(document).bind("click", this.eventHandlers.document_mouseup);
    // dispatch event
    this.events.trigger("row_edit", { grid: this, rowIndex: rowIndex, colIndex: colIndex, dataItem: dataItem });
}

// commits the changes done to the current selected row
DataGrid.prototype.commitEdit = function() {
    if (this.selectedRow == null) return true;
    var tr = this.selectedRow;
    var rowIndex = this.findRowIndex(tr);
    var dataItem = this.model[rowIndex];

    var oldValues = new Object();
    var newValues = new Object();
    var hasChanges = false;
    var footerRebuild = false;
    for (var i = 0; i < this.schema.length; i++) {
        var colSchema = this.schema[i]
        if (colSchema.editable) {
            // set new value
            var td = tr.childNodes[i];
            if (td.getValue) {
                var propName = colSchema.propertyName;
                var sValue = td.getValue();
                oldValues[propName] = dataItem[propName];
                newValues[propName] = this.convertValue(sValue, colSchema.type)
                if (colSchema.type == "date") {
                    if (oldValues[propName].getTime() != newValues[propName].getTime()) hasChanges = true;
                } else if (oldValues[propName] !== newValues[propName]) {
                    hasChanges = true;
                }
                
                if (colSchema.calculateTotal) footerRebuild = true;
            }
        }
    }

    if (tr.validator && !tr.validator.validate()) {
        this.events.trigger("row_update_failed", { grid: this, rowIndex: rowIndex, oldValues: oldValues, newValues: newValues, dataItem: dataItem });
        return false;
    }
    if (hasChanges) {
        var eventArgs = { grid: this, rowIndex: rowIndex, oldValues: oldValues, newValues: newValues, dataItem: dataItem, cancel: false }
        this.events.trigger("row_updating", eventArgs);
        // handle non canceled event
        if (!eventArgs.cancel) {
            for (var propName in newValues) {
                if (typeof newValues[propName] != "function") dataItem[propName] = newValues[propName];
            }
            if (footerRebuild) this.refreshFooter();
            this.events.trigger("row_updated", { grid: this, rowIndex: rowIndex, oldValues: oldValues, newValues: newValues, dataItem: dataItem });
        }
    }
    return true;
}

// removes the selected status from the row and converts back the editboxes to labels.
DataGrid.prototype.cancelEdit = function() {
    if (this.selectedRow == null) return
    this.selectedRow.cancelDocumentClick = false;
    var tr = this.selectedRow;
    var $tr = $(tr);
    this.selectedRow = null;
    if (tr.validator) {
        tr.validator.clear();
        tr.validator = null;
    }
    var rowIndex = this.findRowIndex(tr);
    var dataItem = this.model[rowIndex];
    for (var i = 0; i < tr.childNodes.length; i++) {
        // apply values
        var td = tr.childNodes[i];
        var colSchema = this.schema[td.colIndex];
        if (colSchema.editable) {
            td.removeAttribute("getValue");
            td.cancelClick = false;
            if (td.datePickerCtrl) {
                td.datePickerCtrl.datepicker("hide", "fast");
                td.datePickerCtrl.datepicker("destroy");
                td.datePickerCtrl = null;
            }
            $(td).empty();
            this.appendCellLabel(td, colSchema, dataItem[colSchema.propertyName]);
        }
    }
    $(tr).removeClass("selected");
    $(document).unbind("click", this.eventHandlers.document_mouseup);
    this.events.trigger("row_edit_cancel", { grid: this, rowIndex: rowIndex, dataItem: dataItem });
}

// sorting on headers
DataGrid.prototype.setSort = function(colIndex, sortDirection) {
    $(this.thead).find(".sortUp").removeClass("sortUp");
    $(this.thead).find(".sortDown").removeClass("sortDown");
    $($(this.thead).find("th")[colIndex]).addClass(sortDirection == 1 ? "sortUp" : "sortDown");
}

DataGrid.prototype.getSort = function() {
    if (this.thead == null) return null;
    var th = $(this.thead).find(".sortUp");
    if (th.length == 0) th = $(this.thead).find(".sortDown");
    if (th.length == 0) return null;

    var colIndex = this.findColIndex(this.thead.firstChild, th[0]);
    var direction = th.is(".sortUp") ? 1 : -1;

    return { colIndex: colIndex, sortDirection: direction };
}

// collapses columns
DataGrid.prototype.toggleColumns = function(colIndexes) {
    //var tr = this.selectedRow;
    //if(tr && tr.validator && !tr.validator.validate()) return;
    if (this.buildHeader) {
        for (var i = 0; i < colIndexes.length; i++) {
            var colIx = colIndexes[i];
            var $td = $(this.thead.firstChild.childNodes[colIx]);
            if (!this.collapsedColumns[colIx]) {
                $td.addClass("cellOff");
            } else {
                $td.removeClass("cellOff");
            }
        }
    }
    for (var rowIx = 0; rowIx < this.tbody.childNodes.length; rowIx++) {
        var tr = this.tbody.childNodes[rowIx];
        for (var i = 0; i < colIndexes.length; i++) {
            var colIx = colIndexes[i];
            var td = tr.childNodes[colIx];
            var $td = $(tr.childNodes[colIx]);
            if (!this.collapsedColumns[colIx]) {
                $td.addClass("cellOff");
            } else {
                $td.removeClass("cellOff");
            }
        }
    }
    if (this.tfoot) {
        var tr = this.tfoot.firstChild;
        for (var i = 0; i < colIndexes.length; i++) {
            var colIx = colIndexes[i];
            var td = tr.childNodes[colIx];
            var $td = $(this.tfoot.firstChild.childNodes[colIx]);
            if (!this.collapsedColumns[colIx]) {
                $td.addClass("cellOff");
            } else {
                $td.removeClass("cellOff");
            }
        }
    }

    for (var i = 0; i < colIndexes.length; i++) {
        this.collapsedColumns[colIndexes[i]] = !this.collapsedColumns[colIndexes[i]];
    }
}

/*
* Group: Private methods
*/

// creates the grid's header
DataGrid.prototype.createHeader = function(tbl, schema) {
    // thead * tr
    this.thead = document.createElement("thead");
    var tr = document.createElement("tr");
    this.thead.appendChild(tr);
    for (var i = 0; i < schema.length; i++) {
        // th
        var colSchema = schema[i];
        var th = document.createElement("th");
        th.colIndex = i;
        if (colSchema.className) $(th).addClass(colSchema.className);
        var span = document.createElement("span");
        span.className = "label";
        if (colSchema.sortable) {
            var spanSort = document.createElement("span");
            spanSort.className = "sort";
            span.appendChild(spanSort);
            $(th).addClass("sortable");
            $(th).click(this.eventHandlers.grid_th_click);
        }

        span.appendChild(document.createTextNode(colSchema.headerText));
        th.appendChild(span);
        tr.appendChild(th);
        if (colSchema.hidden) th.style.display = "none";
    }

    tbl.appendChild(this.thead);
}

// creates the grid's footer
DataGrid.prototype.refreshFooter = function() {
    if (this.checkForFooter()) {
        if (this.tfoot != null) this.table.removeChild(this.tfoot);
        this.tfoot = document.createElement("tfoot");
        var tr = document.createElement("tr");
        this.tfoot.appendChild(tr);
        for (var i = 0; i < this.schema.length; i++) {
            var colSchema = this.schema[i];
            var td = document.createElement("td");
            var $td = $(td);
            if (colSchema.className) td.className = colSchema.className;
            tr.appendChild(td);
            var span = document.createElement("span");
            span.className = "label";
            if (colSchema.calculateTotal) {
                var total = this.calculateTotal(colSchema.propertyName);
                if (colSchema.formatString) {
                    if (typeof (colSchema.formatString) == "function") {
                        total = colSchema.formatString(total);
                    } else {
                        total = colSchema.formatString.replace("{v}", total);
                    }
                } else if (colSchema.type == "number") {
                    total = this.formatNumber(total);
                }
                span.appendChild(document.createTextNode(total));
            } else {
                span.innerHTML = "&nbsp;";
            }
            td.appendChild(span);
            if (this.collapsedColumns[i]) $td.addClass("cellOff");
        }
        this.table.appendChild(this.tfoot);
        this.events.trigger("footer_created", { grid: this, tfoot: this.tfoot });
    }
}

DataGrid.prototype.checkForFooter = function() {
    for (var i = 0; i < this.schema.length; i++) {
        if (this.schema[i].calculateTotal) return true;
    }
    return false;
}

DataGrid.prototype.calculateTotal = function(propName) {
    var t = 0;
    for (var i = 0; i < this.model.length; i++) t += this.model[i][propName];
    return t;
}

// creates a grid row
DataGrid.prototype.createRow = function(dataItem, rowIx) {
    var beforeTr = this.tbody.childNodes[rowIx];
    if (!beforeTr) beforeTr = null;
    // tr
    var tr = document.createElement("tr");
    // append cells
    this.createRowCells(tr, dataItem);
    // append row
    this.tbody.insertBefore(tr, beforeTr);
    var rowIndex = this.findRowIndex(tr);
    this.events.trigger("row_created", { grid: this, rowIndex: rowIndex, dataItem: dataItem });
}

// creates the row cells
DataGrid.prototype.createRowCells = function(tr, dataItem) {
    // read schema
    for (var i = 0; i < this.schema.length; i++) {
        var colSchema = this.schema[i];
        var td = document.createElement("td");
        var $td = $(td);
        td.colIndex = i;
        if (colSchema.hidden) td.style.display = "none";
        switch (colSchema.type) {
            case ("button"):
            case ("linkbutton"):
                // cell button
                this.appendCellButton(td, colSchema, dataItem);
                break;
            case ("schema"):
                // subgrid
                var subgrid = new DataGrid(td, colSchema.schema, dataItem[colSchema.propertyName], colSchema.buildHeader)
                this.subGrids.push(subgrid);
                subgrid.events.bind("created", this.eventHandlers.subgrid_created);
                subgrid.events.bind("row_edit_request", this.eventHandlers.subgrid_rowedit_request);
                subgrid.events.bind("row_edit", this.eventHandlers.subgrid_rowedit);
                subgrid.init();
                break;
            default:
                // label
                this.appendCellLabel(td, colSchema, dataItem[colSchema.propertyName]);
                $td.click(this.eventHandlers.grid_td_click);
                if (colSchema.editable) {
                    // editable cell
                    $td.addClass("editable");
                }
                break;
        }
        // hook events
        $td.hover(this.eventHandlers.grid_td_rollover, this.eventHandlers.grid_td_rollout);
        // custom css class
        if (colSchema.className) $td.addClass(colSchema.className);
        if (this.collapsedColumns[i]) $td.removeClass("cellOff");
        tr.appendChild(td);
    }
}

// appends value's label
DataGrid.prototype.appendCellLabel = function(td, schema, value) {
    if (value == undefined || value == null) value = "";
    var ctrl;
    td.cancelClick = false;

    switch (schema.type) {
        case ("boolean"):
            ctrl = document.createElement("input");
            ctrl.type = "checkbox";
            ctrl.defaultChecked = value;
            ctrl.disabled = true;
            break;

        case ("date"):
            if (!schema.formatString) {
                ctrl = document.createElement("span");
                ctrl.className = "label";
                // dateFormat
                value = $.datepicker.formatDate($.datepicker._defaults.dateFormat, value);
                ctrl.appendChild(document.createTextNode(value));
                break;
            } // else goto default

        default:
            ctrl = document.createElement("span");
            ctrl.className = "label";
            if (schema.formatString) {
                if (typeof (schema.formatString) == "function") {
                    value = schema.formatString(value);
                }
                else {
                    value = schema.formatString.replace("{v}", value);
                }
            } else if (schema.type == "number") {
                if (schema.options) {
                    jQuery.each(schema.options, function() {
                        if (value == this.value) value = this.text;
                    });
                } else {
                    value = this.formatNumber(value);
                }
            }
            ctrl.appendChild(document.createTextNode(value));
            break;
    }
    td.appendChild(ctrl);
    return ctrl;
}

// appends a command button
DataGrid.prototype.appendCellButton = function(td, schema, dataItem) {
    var ctrlBtn;
    td.cancelClick = true;
    switch (schema.type) {
        case ("button"):
            ctrlBtn = document.createElement("input");
            ctrlBtn.type = "button"
            ctrlBtn.value = schema.text;
            break;
        case ("linkbutton"):
            ctrlBtn = document.createElement("a");
            var span = document.createElement("span");
            span.appendChild(document.createTextNode(schema.text));
            ctrlBtn.appendChild(span);
            if (schema.linkUrl != undefined && typeof (schema.linkUrl) == "function") {
                ctrlBtn.href = schema.linkUrl(dataItem);
            } else {
                ctrlBtn.href = "javascript:void(0)";
            }

            break;
    }
    ctrlBtn.className = schema.className;
    if (schema.linkUrl == undefined) $(ctrlBtn).click(this.eventHandlers.grid_td_command);
    td.appendChild(ctrlBtn);
    return ctrlBtn;
}

// appends value's editable box
DataGrid.prototype.appendCellEditbox = function(td, schema, value) {
    var tr = td.parentNode;
    td.cancelClick = false;
    var input = document.createElement("input");
    input.type = "text";
    input.setAttribute("autocomplete", "off"); 	// avoid mozilla bug
    input.className = "textbox";
    // type
    switch (schema.type) {
        case ("date"):
            var $input = $(input);
            value = $.datepicker.formatDate($.datepicker._defaults.dateFormat, value);
            td.datePickerCtrl = $input;
            $input.datepicker();
            $input.bind("focus", this.eventHandlers.grid_specialField_focus);
            break;
        case ("string"):
        case ("number"):
            if (schema.maxLength > 0) input.setAttribute("maxLength", schema.maxLength);
            break;
    }

    input.value = value;

    td.getValue = function() { return this.childNodes[0].value; }
    $(input).keydown(this.eventHandlers.grid_input_keypress);

    // validation
    if (schema.validation) {
        if (!tr.validator || tr.validator == null) tr.validator = new FormValidation();
        /*
        DataGrid.Validation.REQUIRED 		= 1;
        DataGrid.Validation.NUMERIC 		= 2;
        DataGrid.Validation.PERCENTAGE 		= 4;
        DataGrid.Validation.ALPHA 		= 8;
        DataGrid.Validation.ALPHANUMERIC	= 16;
        DataGrid.Validation.DATE		= 32;
        DataGrid.Validation.EMAIL		= 64;
        DataGrid.Validation.URL			= 128;
        */
        if ((schema.validation & DataGrid.Validation.REQUIRED) > 0) tr.validator.addValidator(new FieldValidator(input, "required"));
        if ((schema.validation & DataGrid.Validation.NUMERIC) > 0) tr.validator.addValidator(new FieldValidator(input, "numeric"));
        if ((schema.validation & DataGrid.Validation.PERCENTAGE) > 0) tr.validator.addValidator(new FieldValidator(input, "percentage"));
        if ((schema.validation & DataGrid.Validation.ALPHA) > 0) tr.validator.addValidator(new FieldValidator(input, "alpha"));
        if ((schema.validation & DataGrid.Validation.ALPHANUMERIC) > 0) tr.validator.addValidator(new FieldValidator(input, "alphanumeric"));
        if ((schema.validation & DataGrid.Validation.DATE) > 0) tr.validator.addValidator(new FieldValidator(input, "date"));
        if ((schema.validation & DataGrid.Validation.EMAIL) > 0) tr.validator.addValidator(new FieldValidator(input, "email"));
        if ((schema.validation & DataGrid.Validation.URL) > 0) tr.validator.addValidator(new FieldValidator(input, "url"));
    }
    td.appendChild(input);
    return input;
}

DataGrid.prototype.appendCellSelectBox = function(td, schema, value) {
    td.cancelClick = true;
    var select = document.createElement("select");
    select.style.width = "100%";
    for (var i = 0; i < schema.options.length; i++) {
        var t = schema.options[i].text;
        var v = schema.options[i].value;
        if (v == undefined) v = t;
        select.options[select.options.length] = new Option(t, v);
    }
    this.setComboValue(select, value);

    var $select = $(select);
    $select.bind("focus", this.eventHandlers.grid_specialField_focus);
    $select.bind("blur", this.eventHandlers.grid_specialField_blur);
    td.appendChild(select);
    td.getValue = function() { var s = this.childNodes[0]; return s.options[s.selectedIndex].value; }
    return select;
}

// apeends values' checkbox
DataGrid.prototype.appendCellCheckBox = function(td, schema, value) {
    td.cancelClick = false;
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.defaultChecked = value;
    td.appendChild(chk);
    td.getValue = function() { return this.childNodes[0].checked; }
    $(chk).bind("keypress", this.eventHandlers.grid_input_keypress);
    return chk;
}

DataGrid.prototype.convertValue = function(sValue, type) {
    var value = sValue
    // todo: boolean, date, etc
    switch (type) {
        case ("number"):
            value = parseFloat(sValue);
            if (isNaN(value)) value = 0;
            break;
        case ("boolean"):
            if (typeof value != "boolean") value = value.toString().toLowerCase() == "true";
            break;
        case ("date"):
            value = $.datepicker.parseDate($.datepicker._defaults.dateFormat, sValue);
            break;

    }
    return value;
}

DataGrid.prototype.findRowIndex = function(tr) {
    for (var i = 0; i < this.tbody.childNodes.length; i++) {
        if (this.tbody.childNodes[i] == tr) return i;
    }
    return -1;
}

DataGrid.prototype.findColIndex = function(tr, td) {
    for (var i = 0; i < tr.childNodes.length; i++) {
        if (tr.childNodes[i] == td) return i;
    }
    return -1;
}

DataGrid.prototype.findEditableCellIndex = function(tr, direction, colIndex) {
    // TODO: FIX THIS, NOT WORKING WITH COLLAPSED COLUMNS
    if (colIndex == undefined || colIndex == null) colIndex = -1;
    var newColIndex = colIndex + direction;
    var lastValidIndex = this.schema.length - 1;
    if (direction == 1) {
        for (var i = newColIndex; i < this.schema.length; i++) {

            if (this.schema[i].editable && !$(tr.childNodes[i]).is(".cellOff")) {
                lastValidIndex = i;
                newColIndex = i;
                break;
            }
        }
    } else {
        for (var i = newColIndex; i >= 0; i--) {
            if (this.schema[i].editable && !$(tr.childNodes[i]).is(".cellOff")) {
                newColIndex = i;
                break;
            }
        }
    }
    //alert(colIndex == newColIndex)
    //alert(lastValidIndex);
    if (newColIndex < 0 || newColIndex > lastValidIndex || !this.schema[newColIndex].editable) {
        if (direction == -1) {
            return this.findEditableCellIndex(tr, this.schema.length, -1);
        } else {
            return this.findEditableCellIndex(tr, 0, 1);
        }
    } else {
        return newColIndex;
    }
}

DataGrid.prototype.getComboValue = function(select) {
    var option = select.options[select.selectedIndex];
    if (option.value) {
        return option.value;
    } else {
        return option.label;
    }
}

DataGrid.prototype.setComboValue = function(select, value) {
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value == value) {
            select.selectedIndex = i;
            return;
        }
    }
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].label == value) {
            select.selectedIndex = i;
            return;
        }
    }
}
DataGrid.prototype.findEventTarget = function(e, nodeName) {
    var target = (e.currentTarget || e.target);
    if (nodeName == undefined) return target;
    var $target = jQuery(target);
    if (!$target.is(nodeName))
        $target = $target.parent(nodeName);
    return $target[0];
}

/*
* Group: Internal Event handlers
*/

// th.click
DataGrid.prototype.grid_th_click = function(e) {
    var th = this.findEventTarget(e, "th");
    var colIndex = th.colIndex;
    var direction = $(th).is(".sortUp") ? -1 : 1;
    this.events.trigger("sort_request", { grid: this, colIndex: colIndex, sortBy: this.schema[colIndex].propertyName, sortDirection: direction });
}

// td.rollover
DataGrid.prototype.grid_td_rollover = function(e) {
    var td = this.findEventTarget(e, "td");
    var $tr = $(td).parent("tr");
    if ($tr.length == 1 && $tr[0] != this.selectedRow) {
        if (!$tr.is(".selected"))
            $tr.addClass("over");
        var rowIndex = this.findRowIndex($tr[0]);
        var dataItem = this.model[rowIndex];
        this.events.trigger("row_rollover", { grid: this, rowIndex: rowIndex, colIndex: td.colIndex, dataItem: dataItem });
    }
}

// td.rollout
DataGrid.prototype.grid_td_rollout = function(e) {
    var td = this.findEventTarget(e, "td");
    var $tr = $(td).parent("tr");
    if ($tr.length == 1 && $tr[0] != this.selectedRow) {
        if (!$tr.is(".selected"))
            $tr.removeClass("over");
        var rowIndex = this.findRowIndex($tr[0]);
        var dataItem = this.model[rowIndex];
        this.events.trigger("row_rollout", { grid: this, rowIndex: rowIndex, colIndex: td.colIndex, dataItem: dataItem });
    }
}

// td.click
DataGrid.prototype.grid_td_click = function(e) {
    var td = this.findEventTarget(e, "td");
    if (td.cancelClick) return;

    if (this.schema[td.colIndex].editable) {
        this.editRow(td.parentNode, td.colIndex);
    } else {
        var $tr = $(td).parent("tr");
        var rowIndex = this.findRowIndex($tr[0]);
        var dataItem = this.model[rowIndex];
        this.events.trigger("row_click", { grid: this, rowIndex: rowIndex, colIndex: td.colIndex, dataItem: dataItem });
    }
}

// td.input.keypress
DataGrid.prototype.grid_input_keypress = function(e) {
    var tdSelected = this.findEventTarget(e, "td");
    var targetRow = null;
    var direction;
    var colIndex = tdSelected.colIndex;
    var endIt = false;
    switch (e.keyCode) {
        case (13): 	// KEY_RETURN 
            targetRow = (e.shiftKey) ? this.selectedRow.previousSibling : this.selectedRow.nextSibling;
            direction = (e.shiftKey) ? -1 : 1;
            endIt = e.ctrlKey;
            if (e.preventDefault) e.preventDefault();
            break;
        case (38): 	// KEY_UP
            targetRow = this.selectedRow.previousSibling;
            direction = -1;
            if (e.preventDefault) e.preventDefault();
            break;
        case (40): 	// KEY_DOWN
            targetRow = this.selectedRow.nextSibling;
            direction = 1;
            if (e.preventDefault) e.preventDefault();
            break;
        case (27): 	// KEY_ESC
            this.cancelEdit();
            return true;
        case (9): 	// KEY_TAB	
            targetRow = this.selectedRow;
            colIndex = this.findEditableCellIndex(targetRow, (e.shiftKey) ? -1 : 1, colIndex);
            if (e.preventDefault) e.preventDefault();
            break;
        default:
            return true;
    }


    if (targetRow) {
        if (targetRow != this.selectedRow) {
            if (!this.commitEdit()) return false;
        }
        if (endIt) {
            this.cancelEdit();
        } else {
            this.editRow(targetRow, colIndex);
        }
    } else {
        this.events.trigger("row_edit_request", { grid: this, direction: direction, colIndex: colIndex });
        if (this.commitEdit()) this.cancelEdit();
    }

    return false;
}

DataGrid.prototype.grid_specialField_focus = function(e) { if (this.selectedRow) this.selectedRow.cancelDocumentClick = true; }
DataGrid.prototype.grid_specialField_blur = function(e) { if (this.selectedRow) this.selectedRow.cancelDocumentClick = false; }

// td.command (linkbutton / button)
DataGrid.prototype.grid_td_command = function(e) {
    var td = this.findEventTarget(e, "td");
    var tr = $(td).parent("tr")[0];
    var rowIndex = this.findRowIndex(tr)
    var dataItem = this.model[rowIndex];
    this.events.trigger("row_command", { grid: this, commandName: this.schema[td.colIndex].commandName, rowIndex: rowIndex, dataItem: dataItem });
    e.preventDefault();
}

// sub-grid event handlers
// sub-grid on create
DataGrid.prototype.subgrid_created = function(e, args) {
    this.events.trigger("subgrid_created", { grid: this, subgrid: args.grid });
}

// sub-grid on row edit
DataGrid.prototype.subgrid_rowedit = function(e, args) {
    if (!this.commitEdit()) return;
    this.cancelEdit();
    for (var i = 0; i < this.subGrids.length; i++) {
        if (this.subGrids[i] != args.grid) {
            if (!this.subGrids[i].commitEdit()) return;
            this.subGrids[i].cancelEdit();
        }
    }
}

// sub-grid on edit request
DataGrid.prototype.subgrid_rowedit_request = function(e, args) {
    var targetGrid;
    for (var i = 0; i < this.subGrids.length; i++) {
        if (this.subGrids[i].table == args.grid.table) {
            targetGrid = this.subGrids[i + args.direction];
            if (targetGrid) {
                if (!this.commitEdit()) return;
                this.cancelEdit();
            }
        }
    }

    if (targetGrid) {
        var tr;
        var td;
        if (args.direction == 1) {
            // edit first row
            var tr = targetGrid.tbody.childNodes[0];
        } else {
            // edit last row
            var tr = targetGrid.tbody.childNodes[targetGrid.tbody.childNodes.length - 1];
        }
        targetGrid.editRow(tr, args.colIndex);
    } else {
        if (this.commitEdit()) this.cancelEdit();
    }
}

// document event handlers
DataGrid.prototype.document_mouseup = function(e) {
    if (this.selectedRow != null && !this.selectedRow.cancelDocumentClick) {
        var $table = $(this.table);
        var mPos = {
            x: e.pageX - $table.offset().left,
            y: e.pageY - $table.offset().top
        };
        if (mPos.x < 0 ||
		mPos.y < 0 ||
		mPos.x > this.table.offsetWidth ||
		mPos.y > this.table.offsetHeight) {
            if (this.commitEdit()) this.cancelEdit();
        }
    }
}

// helpers functions
DataGrid.prototype.formatNumber = function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}


/*
* Changelog
*
* 25/09/2006:
*	- added support for boolean types
*	- added command buttons (button, linkbutton types)
*	- added more events (row_edit, row_edit_commit, row_edit_cancel, row_edit_request, row_command)
*	- basic field validation using lib.validation.js
*
* 26/09/2006:
*	- editRow now accepts an integer as first argument
*	- replaced 'className' with prototype's Element.addClassName and Element.removeClassName
*	- added 'row_created', 'subgrid_created' events.
*	- replaced parseInt() with parseFloat() in DataGrid.convertValue()
*	- added 'cancelClick' on <td>.
*
* 02/10/2006:
*	- input.select() only get called on the first cell's click
*	- commit edit on last subgrid_rowedit_request
*	- fixed error on 'grid_td_rollover'
*	- fixed bug in td.cancelClick
*
* 04/10/2006:
*	- refactored row creations
*	- event 'row_edit_commit' now contains the property 'cancelCommit' for cancelling the edit changes
*	- method insertRow()
*	- method refreshRow()
*	- method getRows()
*	- method removeRow()
*
* 10/10/2006:
*	- added 'percentage' validation to fields
*	- wrapped event handlers
*	- added 'row_edit_commited' event
*	- control + enter now commits edit
*
* 19/10/2006:
*	- some memory leaks fixed
*
* 20/10/2006:
*	- collapsable columns
*	- calculateTotals on footer
*
* 03/11/2006:
*	- 'footer_created' event
*	- calculated fields now get displayes using the formatString options from the column schema
*	- support for comboboxes within grid schema
* 
* 14/11/2006:
*	- schema 'formatString' now accepts a function
*	- 'number' dataFields get formatted using formatNumber()
*
* 17/11/2006:
*	- fixed some IE bugs
*
* 04/12/2006:
*	- added 'row_edit_commit_failed' event
*	- fixed focus issue when changing input with mouse click
*
* 29/05/2008:
*  - added support for date types.
*  - added date picker (jQuery UI Date Picker - http://marcgrabanski.com/code/ui-datepicker)
*  
* 28/05/2008:
*  - migrated from prototype to jQuery 1.2.5
*
* 07/04/2009:
*  - added 'sort_request' event
*  - added setSort() and getSort()
*
*/