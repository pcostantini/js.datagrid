    // Dependencies:
    // - lib.jquery-1.2.5.js
    // - lib.base.js

    function Paginator(container, changePageCallback) {
    this.container = container;
    this.changePageCallback = changePageCallback;

    this.events = $("<a></a>");
    this.eventHandlers = {
	link_click: this.link_click.toEvent(this)
    };
}

Paginator.prototype.setPages = function(totalPages, currentPage) {
    this.totalPages = totalPages;
    this.currentPage = currentPage;
    $container = $(this.container).empty();

    if (this.currentPage <= 1) {
	$container.append($("<span class=\"selected\"><span>«</span></span>"));
    } else {
	var $firstPage = $("<a href=\"javascript:void(0)\"><span>«</span></a>");
	$firstPage[0].page = this.currentPage - 1;
	$firstPage.click(this.eventHandlers.link_click);
	$container.append($firstPage);
    }

    $container.append("<span class=\"sepa\"> | </span>");

    for (var i = 1; i <= this.totalPages; i++) {
	if (i == this.currentPage) {
	    $container.append("<span class=\"selected\"><span>" + i + "<span></span>");
	} else {
	    var $page = $("<a href=\"javascript:void(0)\"><span>" + i + "</span></a>");
	    $page[0].page = i;
	    $page.click(this.eventHandlers.link_click);
	    $container.append($page);
	}

	$container.append("<span class=\"sepa\"> | </span>");
    }

    if (this.currentPage >= this.totalPages) {
	$container.append($("<span class=\"selected\">»</span>"));
    } else {
	var $lastPage = $("<a href=\"javascript:void(0)\"><span>»</span></a>");
	$lastPage[0].page = this.currentPage + 1;
	$lastPage.click(this.eventHandlers.link_click);
	$container.append($lastPage);
    }
}

Paginator.prototype.link_click = function(e) {
    var a = this.findEventTarget(e, "a");
    var page = a.page;
    this.events.trigger("change", { sender: this, page: page });
}

Paginator.prototype.findEventTarget = function(e, nodeName) {
    var target = (e.currentTarget || e.target);
    if (nodeName == undefined) return target;
    var $target = jQuery(target);
    if (!$target.is(nodeName))
	$target = $target.parent(nodeName);
    return $target[0];
}