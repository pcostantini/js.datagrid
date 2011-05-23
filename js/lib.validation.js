/*
 * js.luminicbox - lib.validation.js v0.1.0
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


// ****************************
// FormValidation class
// ****************************
FormValidation = function(form, validationSummary) {
	// init
	this.form = null;
	this.validators = new Array();
	// listeners
	this.events = {
		form_onSubmit: this.form_onSubmit.toEvent(this),
		control_onEvent: this.control_onEvent.toEvent(this)
	};
	
	if(form) this.setForm(form);
	if(validationSummary) this.validationSummary = validationSummary;
}
// addValidator
FormValidation.prototype.addValidator = function(validator) {
	if(!validator.validate) {
		alert("ERR:FormValidation.addValidator()\nthe validator must implement a validate() method");
		return;
	}
	if(validator.controlToValidate != null) $(validator.controlToValidate).blur(this.events.control_onEvent);
	this.validators.push(validator);
}
// clear
FormValidation.prototype.clear = function() {
	for(var i=0; i<this.validators.length; i++) {
		var validator = this.validators[i];
		$(validator.controlToValidate).unbind("blur", this.events.control_onEvent);
		validator.controlToValidate = null;
	}
}
// setForm
FormValidation.prototype.setForm = function(newForm) {
	if(this.form != null)  $(this.form).unbind("submit", this.events.form_onSubmit);
	this.form = newForm;
	if (this.form != null) $(this.form).bind("submit", this.events.form_onSubmit);
}
// validate
FormValidation.prototype.validate = function() {
	this.reset();
	var isValid = true;
	var failedValidators = new Array();
	for(var i=0; i<this.validators.length; i++) {
		if(!this.validateValidator(this.validators[i])) {
			failedValidators.push(this.validators[i]);
			isValid = false;
		}
	}
	if(this.validationSummary) this.validationSummary.showErrors(failedValidators);
	return isValid;
}
// reset
FormValidation.prototype.reset = function() {
	for(var i=0; i<this.validators.length; i++) this.resetValidator(this.validators[i]);
	if(this.validationSummary) this.validationSummary.reset();
}

// resetValidator
FormValidation.prototype.resetValidator = function(validator) {
	var control = validator.controlToValidate;
	if(control != null) {
		control.isValid = true;
		$(control).removeClass("error");
	}
}
// validateValidator
FormValidation.prototype.validateValidator = function(validator) {
	var control = validator.controlToValidate;
	if(!validator.validate()) {
		if(control != null) control.isValid = false;
		validator.showError();
		return false;
	}
	return true;
}
// form.onSubmit
FormValidation.prototype.form_onSubmit = function(e) {
	var isValid = this.validate();
	return isValid;
}
// control.onEvent
FormValidation.prototype.control_onEvent = function(e) {
	var targetControl = e.target;
	var targetValidators = new Array();
	for(var i=0; i<this.validators.length; i++) {
		var validator = this.validators[i];
		if(validator.controlToValidate == targetControl) {
			this.resetValidator(validator);
			targetValidators.push(validator);
		}
	}
	for(var i=0; i<targetValidators.length; i++) {
		this.validateValidator(targetValidators[i]);
	}
}


// ****************************
// FieldValidator class
// ****************************
FieldValidator = function(controlToValidate, validationType, message) {
	this.controlToValidate = controlToValidate;
	this.validationType = validationType;
	this.valueProperty = "value";
	this.message = message;
}
// validate
FieldValidator.prototype.validate = function() {
	var v=this.controlToValidate.value
	switch (this.validationType)
	{
		case "required" :
			return !this.IsEmpty(v);
		case "email" :
			return (this.IsEmpty(v) || /\w{1,}[@][\w\-]{1,}([.]([\w\-]{1,})){1,3}$/.test( v ))
		case "numeric" :	
			return this.IsEmpty(v) || (!isNaN(v) && !/^\s+$/.test(v));
		case "percentage" :
			var per = parseFloat(v);
			return this.IsEmpty(v) || (!isNaN(v) && !/^\s+$/.test(v) && (per >= 0) && (per <= 100) );
		case "alpha" :
		    return this.IsEmpty(v) || !/(0|1|2|3|4|5|6|7|8|9|>|<|=|:|"|@|#|%|{|}|&|'|-)+$/.test(v) && !/^\s+$/.test(v);
		case "alphanumeric" :
			return this.IsEmpty(v) ||  !/\W/.test(v)
		case "date" :
			var test = new Date(v);
			return this.IsEmpty(v) || !isNaN(test);
		case "url" :
			return this.IsEmpty(v) || /^(http|https|ftp):\/\/(([A-Z0-9][A-Z0-9_-]*)(\.[A-Z0-9][A-Z0-9_-]*)+)(:(\d+))?\/?/i.test(v)
		default :
			return true;
	}
}
//show error
FieldValidator.prototype.showError= function() {
	$(this.controlToValidate).addClass("error");
}
FieldValidator.prototype.IsEmpty = function(v) {
	return  ((v == null) || (v.length == 0));
};


// ****************************
// ComboValidator class
// ****************************
ComboValidator = function(controlToValidate, message) {
	this.controlToValidate = controlToValidate;
	this.message = message;
}
// validate
ComboValidator.prototype.validate = function() {
	return (this.controlToValidate.selectedIndex!=0)
};
ComboValidator.prototype.showError= function() {
	$(this.controlToValidate).removeClass("error");
}	

// ****************************
// CustomValidator class
// ****************************
CustomValidator = function(controlToValidate, validationFunction, message) {
	this.controlToValidate = controlToValidate;
	this.validationFunction = validationFunction;
	this.message = message;
}
CustomValidator.prototype.validate = function() {
	return this.validationFunction();
}
CustomValidator.prototype.showError = function() {
	if(this.controlToValidate != null) $(this.controlToValidate).addClass("error");
}



// ****************************
// ValidationSummary class
// ****************************
function ValidationSummary(summaryContainer, headingMessage) {
	this.summaryContainer = summaryContainer;
	this.headingMessage = (!headingMessage) ? "" : headingMessage;
}

ValidationSummary.prototype.showErrors = function(validators) {
	this.reset();
	if(validators.length > 0) {
		if(this.headingMessage != "") {
			var h3 = document.createElement("h3");
			h3.appendChild( document.createTextNode(this.headingMessage) );
			this.summaryContainer.appendChild(h3);
		}
		var ul = document.createElement("ul");
		this.summaryContainer.appendChild(ul);
		for(var i=0; i<validators.length; i++) {
			var li = document.createElement("li");
			var validator = validators[i];
			li.appendChild( document.createTextNode(validator.message) );
			if(validator.controlToValidate && validator.controlToValidate.focus) {
				li.validatedControl = validator.controlToValidate;
				li.onclick = function() { this.validatedControl.focus(); };
				li.style.cursor = "pointer";
			}
			ul.appendChild(li);
		}
		this.summaryContainer.style.display = "block";
	}
}

ValidationSummary.prototype.reset = function() {
	this.clearContainerContents(this.summaryContainer);
	this.summaryContainer.style.display = "none";
}

ValidationSummary.prototype.clearContainerContents = function(container) {
	while(container.childNodes.length > 0) container.removeChild(container.childNodes[0]);
}

/*
 * Changelog
 *
 * 28/05/2008:
 *  - migrated to jQuery 1.2.5 (wip)
 */