var Utils = function () {}, utils;

Utils.prototype.yyyymmdd = function (dateObj) {
    'use strict';
    var d = [];
    
    if (dateObj === undefined) { dateObj = new Date(); }
    if (Object.prototype.toString.call(dateObj) !== '[object Date]') {
        throw new Error('The argument for `yyyymmdd()` must be a date object.');
    }
 
    d[0] = dateObj.getFullYear();
    
    /* Left zero pad months, dates */
    d[1] = '0' + (dateObj.getMonth() + 1); // JS months are 0-11
    d[2] = '0' + dateObj.getDate();
   
   	/* 
   	 Pull last two characters, which will return zero 
   	 padded numbers if applicable.
   	*/
    d[1] = d[1].substr(-2);
    d[2] = d[2].substr(-2);
    
    return d.join('-');
};

Utils.prototype.loadShim = function () {
	if (window.indexedDB === undefined && typeof window.openDatabase === 'function' ) {
		script = document.createElement('script');
		script.src = 'js/IndexedDBShim.min.js';
		document.body.insertBefore(script, document.body.lastElementChild);
	}
}

utils = new Utils();

