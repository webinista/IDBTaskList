var idb, dbobject, search, list, show, triggers, thead, tbody, deletebtn;
    
/* Functions */
var addnew, addnewhandler, addcheckbox, buildtask, displaytasks, hashchangehandler, hide, init, searchhandler, sort, viewentry, updatestatus, deletehandler, errorhandler, timestamp;


utils.loadShim();

search = document.getElementById('search');
addnew = document.getElementById('addnew');
list   = document.getElementById('list');
thead  = document.getElementsByTagName('thead')[0];
tbody  = document.querySelector('#list tbody');
deletebtn = document.getElementById('delete');
triggers = document.querySelectorAll('button[type=button]:not(#delete)');

Array.prototype.map.call(triggers, function (b) {
    'use strict';
    var today = utils.yyyymmdd();
    b.addEventListener('click', function (e) {
        if (e.target.dataset.show) {
            show(b.dataset.show);
        }
        if (e.target.dataset.hide) {
            hide(b.dataset.hide);
        }
        window.location.hash = '';
        /* Reset add new form because some browsers like 
           to hold on to that form data. */
        addnew.reset();
        
        /* Set default start, due dates */
        addnew.start.value = today;
        addnew.due.value   = today;       
    });
});

/* Global error handler message */
errorhandler = function(errorevt){
	console.error(errorevt.target.error.message);
	console.log('error');
	console.log(errorevt);
}

timestamp = function(datefield){
	if (!isNaN(datefield.valueAsNumber)) {
		return datefield.valueAsNumber;
	} else {
		return new Date(datefield.value).getTime();
	}
}

/* Functions to show or hide our views */
show = function (elid) {
    'use strict';
    document.querySelector(elid).classList.remove('hidden');
    
    if (addnew.dataset.mode == 'edit'){
        deletebtn.classList.remove('hidden');   
    } else {
        deletebtn.classList.add('hidden');   
    }
};
hide = function (elid) {
    'use strict';
    document.querySelector(elid).classList.add('hidden');
    deletebtn.classList.add('hidden');
};

/* 
Fired on page load. Creates the database and indexes if it
doesn't exist. Displays existing tasks if there are any.
*/
init = function () {
    'use strict';
    
    idb = indexedDB.open('IDBTaskList', 2);

    idb.onupgradeneeded = function (evt) {
        var tasks, transaction;
        
        dbobject = evt.target.result;
        
        if (evt.oldVersion < 1) {
            tasks = dbobject.createObjectStore('tasks', {autoIncrement: true});
            transaction = evt.target.transaction.objectStore('tasks');
            transaction.createIndex('by_task', 'task');
            transaction.createIndex('priority', 'priority');
            transaction.createIndex('status', 'status');
            transaction.createIndex('due', 'due');
            transaction.createIndex('start', 'start');
        }
    };

    idb.onsuccess = function (event) {
        if (dbobject === undefined) {
            dbobject = event.target.result;
        }
        displaytasks(dbobject);
    };
};

/* Retrieves and displays the list of tasks */
displaytasks = function (database) {
	'use strict';
	
    var transaction, objectstore, index, request, docfrag = document.createDocumentFragment();
	
	transaction = dbobject.transaction(['tasks'], 'readonly');
	objectstore = transaction.objectStore('tasks');
	
	/* Search the by_task index since it's already sorted alphabetically */
	index       = objectstore.index('by_task');
	request     = index.openCursor(IDBKeyRange.lowerBound(0), 'next');
	
	request.onsuccess = function (successevent) {
		var cursor, task;
		cursor = request.result;
		if (cursor) {
			task = buildtask(cursor);
            docfrag.appendChild(task);
			cursor.continue();
		} 
      	
      	if (docfrag.childNodes.length) {
            tbody.appendChild(docfrag);
            hide('#addnew');
            show('#tasklist');
            show('#list');
        }      
	};
};

buildtask = function (recordobject) {
    'use strict';
	var o, td, tr, txt, d, status, record;
	tr = document.createElement('tr');
	
	record = recordobject.value;
	record.primaryKey = recordobject.primaryKey;
	
	if (record) {
		for (o in record) {
        
        	/* Remove the notes and start properties */
        	delete record.notes;
        	delete record.start;
        	
            if (record.hasOwnProperty(o)) {
                td = document.createElement('td');
                
                if (o === 'task') {
                   	td.setAttribute('data-recordid', record.primaryKey);
                   	status = addcheckbox(recordobject.primaryKey, record.status);
                   	delete record.primaryKey;
                }
                
    			if (o === 'due') {
    				if(record[o]){
    					record[o] = new Date(record[o]);
						record[o] = [(record[o].getMonth() + 1), record[o].getDate(), record[o].getFullYear()].join('/');
					} else {
						record[o] = '—';
					}
                } 
                        
                if (o !== 'status') {
               		txt = document.createTextNode(record[o]);
                    td.appendChild(txt);
                    tr.appendChild(td);
                }
            }
        }
      	
      	/* Add blank cell for status */
        td.appendChild(status);
        tr.appendChild(td); 
        return tr;
	}
};

addcheckbox = function (id, checked) {
    'use strict';
    var status = document.createElement('input');
    status.type  = 'checkbox';
	status.id    = id;
	status.checked = checked;
    return status;
};

addnewhandler = function (evt) {
    'use strict';
	evt.preventDefault();

	var entry = {}, transaction, objectstore, request, fields = evt.target, results;
    
    /* Build our task object */
    entry.task  = fields.task.value;
   
    /* If there's a date, save as time stamps instead of date strings. */
	fields.start.value == '' ? entry.start = '' : entry.start = timestamp(fields.start); 
    fields.due.value   == '' ? entry.due   = '' : entry.due   = timestamp(fields.due);
   	
    /*  Convert to number */
    entry.priority  = +fields.priority.value;
    entry.notes     = fields.notes.value;
    entry.status    = 0;
        
	transaction  = dbobject.transaction(['tasks'], 'readwrite');
	objectstore  = transaction.objectStore('tasks');
	
	if (fields.key.value) {
        request  = objectstore.put(entry, +fields.key.value);
    } else {
        request  = objectstore.add(entry);
    }
    /* 
    Returns ID of last addition / update. Not necessary for
    this application. Here to show that it can be done. 
    */
    request.onsuccess = function (evt) {
        results = request.result;
    };
    
    
    
    transaction.oncomplete = function (evt) {
        tbody.innerHTML = '';
        displaytasks(dbobject);
    };
    
    transaction.onerror = errorhandler;
};

updatestatus = function (evt) {
	'use strict';
    if (evt.target.nodeName === 'INPUT') {
        
		var transaction, objectstore, request,
            key = +evt.target.id; /* Need to convert from a numeric string to a number to retrieve a numbered key.*/
	
		transaction = dbobject.transaction(['tasks'], 'readwrite');
		objectstore = transaction.objectStore('tasks');
		
		request     = objectstore.get(key);
	
		request.onsuccess =  function (reqevt) {
			reqevt.target.result.status =  +evt.target.checked;
			objectstore.put(reqevt.target.result, key);
		};
	}
};

searchhandler = function (evt) {
    'use strict';
	evt.preventDefault();
	var transaction, objectstore, index, request, docfrag = document.createDocumentFragment();
	
	transaction = dbobject.transaction(['tasks'], 'readwrite');
	objectstore = transaction.objectStore('tasks');
	index       = objectstore.index('by_task');
	request     = index.openCursor(IDBKeyRange.lowerBound(0), 'next');
	
	/* Clear table body */
	tbody.innerHTML = '';
	
	request.onsuccess = function (successevent) {
		var reg, cursor, task;
		reg = new RegExp(evt.target.find.value, "i");
		cursor = request.result;
				
		if (cursor !== null) {
			if (reg.test(cursor.value.task) || reg.test(cursor.value.notes)) {
				task = buildtask(cursor);
				docfrag.appendChild(task);
			}
			cursor.continue();
		}
		tbody.appendChild(docfrag);
	};
};

hashchangehandler = function (evt) {
    'use strict';
    var transaction, objectstore, request, key;
    
    // Deliberately testing for a truthy rather than a true value
    if (window.location.hash.replace(/#/,'')) {
        key = +window.location.hash.match(/\d/g).join('');
    
        transaction  = dbobject.transaction(['tasks'], 'readonly');
        objectstore  = transaction.objectStore('tasks');
        request      = objectstore.get(key);
    
        request.onsuccess = function (successevent) {
            var status = !!successevent.target.result.status;
            
            if (status) {
                addnew.status.checked = status;
            }
            
            addnew.key.value = key;
            addnew.task.value = successevent.target.result.task;
        
        	successevent.target.result.start ? addnew.start.value = utils.yyyymmdd(new Date(successevent.target.result.start)) : addnew.start.value = '';
            successevent.target.result.due   ? addnew.due.value = utils.yyyymmdd(new Date(successevent.target.result.due)) : addnew.due.value = '';
 
            addnew.priority.value = successevent.target.result.priority;
            addnew.notes.value = successevent.target.result.notes;
        };
        
        transaction.oncomplete = function (evt) {
            hide('#tasklist');
            show('#addnew');
        };
    }
};

viewentry = function (evt) {
    'use strict';
    if (evt.target.nodeName === 'TD' && evt.target.dataset.recordid) {
        addnew.dataset.mode  = 'edit';
        window.location.hash = '/view/' + evt.target.dataset.recordid;
    }
};

deletehandler = function (evt) {
    'use strict';
    var transaction, objectstore, request, key;
    
    /* 
     Deliberately testing for a truthy rather than a true value.
     Replacing the # for IE11's sake.
    */
    if (window.location.hash.replace(/#/,'')) {
        key = +window.location.hash.match(/\d/g).join('');
        
        transaction  = dbobject.transaction(['tasks'], 'readwrite');
        objectstore  = transaction.objectStore('tasks');
        request      = objectstore.delete(key);
        
        /* Don't need to define an onsuccess function */
        request.onsuccess = function (successevent) {};
      
        transaction.oncomplete = function (evt) {
            tbody.innerHTML = '';
            displaytasks(dbobject);
        };
        transaction.onerror = errorhandler;
    }
};

sort = function (evt) {
    'use strict';
	var which, dir, docfrag = document.createDocumentFragment(), index, transaction, objectstore, request;
	
	/* Clear table body */
	tbody.innerHTML = '';
	
	/* Remove 'active' class from THs */
	Array.prototype.map.call(document.querySelectorAll('#list th'), function (th) {
		th.classList.remove('active');
	});
	
	if (evt.target.nodeName === 'TH') {
		evt.target.classList.add('active');
		
		switch (evt.target.innerHTML) {
			case 'Priority':
                which = 'priority';
                break;
			case 'Due':
				which = 'due';
				break;
			case 'Complete':
				which = 'status';
				break;
			case 'Task':
				which = 'by_task';
				break;
		}
		
		evt.target.classList.toggle('asc');
		
		dir = evt.target.classList.contains('asc') ? 'next' : 'prev';
			
		transaction = dbobject.transaction(['tasks'], 'readwrite');
		objectstore = transaction.objectStore('tasks');
		index       = objectstore.index(which);
		request     = index.openCursor(IDBKeyRange.lowerBound(0), dir);
	
		/* Clear table body */
		tbody.innerHTML = '';
		
		request.onsuccess = function (successevent) {
			var cursor, task;
			cursor = request.result;
				
			if (cursor !== null) {
				task = buildtask(cursor);
				docfrag.appendChild(task);
				cursor.continue();
			}
			if(docfrag.childNodes.length){
				tbody.appendChild(docfrag);
			}
		};
	}
};

deletebtn.addEventListener('mousedown', deletehandler);
list.addEventListener('click', updatestatus);
search.addEventListener('submit', searchhandler);
thead.addEventListener('click', sort);
tbody.addEventListener('click', viewentry);
addnew.addEventListener('submit', addnewhandler);
window.addEventListener('hashchange', hashchangehandler);
window.addEventListener('load', init);
