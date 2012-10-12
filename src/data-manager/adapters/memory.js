(function( AeroGear, $, uuid, undefined ) {
    /**
        The Memory adapter is the default type used when creating a new store. Data is simply stored in a data var and is lost on unload (close window, leave page, etc.)
        @constructs AeroGear.DataManager.adapters.Memory
        @param {String} storeName - the name used to reference this particular store
        @param {Object} [settings={}] - the settings to be passed to the adapter
        @param {String} [settings.recordId="id"] - the name of the field used to uniquely identify a "record" in the data
        @param {Boolean} [settings.dataSync=false] - if true, any pipes associated with this store will attempt to keep the data in sync with the server (coming soon)
        @returns {Object} The created store
     */
    AeroGear.DataManager.adapters.Memory = function( storeName, settings ) {
        // Allow instantiation without using new
        if ( !( this instanceof AeroGear.DataManager.adapters.Memory ) ) {
            return new AeroGear.DataManager.adapters.Memory( storeName, settings );
        }

        settings = settings || {};

        // Private Instance vars
        var recordId = settings.recordId ? settings.recordId : "id",
            type = "Memory",
            name = storeName,
            data = null,
            dataSync = !!settings.dataSync;

        // Privileged Methods
        /**
            Returns the value of the private recordId var
            @private
            @augments Memory
            @returns {String}
         */
        this.getRecordId = function() {
            return recordId;
        };

        /**
            Returns the value of the private name var
            @private
            @augments Memory
            @returns {String}
         */
        this.getName = function() {
            return name;
        };

        /**
            Returns the value of the private data var, filtered by sync status if necessary
            @private
            @augments Memory
            @param {Boolean} [noSync] - get all data no matter it's sync status
            @returns {Array}
         */
        this.getData = function( noSync ) {
            var activeData = [],
                item,
                syncStatus;

            if ( dataSync && !noSync ) {
                for ( item in data ) {
                    syncStatus = data[ item ][ "ag-sync-status" ];
                    if ( syncStatus !== AeroGear.DataManager.STATUS_REMOVED ) {
                        activeData.push( data[ item ] );
                    }
                }
                return activeData;
            } else {
                return data;
            }
        };

        /**
            Sets the value of the private data var
            @private
            @augments Memory
         */
        this.setData = function( newData, reset ) {
            var curData = data || [],
                curItem,
                newItem,
                found;

            if ( !dataSync && reset ) {
                data = newData;
                return;
            }

            if ( curData.length ) {
                for ( curItem in curData ) {
                    found = false;
                    for ( newItem in newData ) {
                        if ( newData[ newItem ][ recordId ] == curData[ curItem ][ recordId ] ) {
                            if ( dataSync ) {
                                newData[ newItem ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_MODIFIED;
                            }
                            curData[ curItem ] = newData[ newItem ];
                            newData.splice( newItem, 1 );
                            found = true;
                            break;
                        }
                    }

                    if ( !found && reset ) {
                        if ( dataSync ) {
                            curData[ curItem ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_REMOVED;
                        } else {
                            curData.splice( curItem, 1 );
                        }
                    }
                }
            }

            if ( newData.length ) {
                for ( newItem in newData ) {
                    newData[ newItem ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_NEW;
                    curData.push( newData[ newItem ] );
                }
            }
            data = curData;
        };

        /**
            Empties the value of the private data var
            @private
            @augments Memory
         */
        this.emptyData = function() {
            if ( dataSync ) {
                for ( var item in data ) {
                    data[ item ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_REMOVED;
                }
            } else {
                data = null;
            }
        };

        /**
            Adds a record to the store's data set
            @private
            @augments Memory
         */
        this.addDataRecord = function( record ) {
            data = data || [];
            if ( dataSync ) {
                record[ "ag-sync-status" ] = AeroGear.DataManager.STATUS_NEW;
                record.id = record.id || uuid();
            }
            data.push( record );
        };

        /**
            Adds a record to the store's data set
            @private
            @augments Memory
         */
        this.updateDataRecord = function( index, record ) {
            if ( dataSync ) {
                record[ "ag-sync-status" ] = AeroGear.DataManager.STATUS_MODIFIED;
            }
            data[ index ] = record;
        };

        /**
            Removes a single record from the store's data set
            @private
            @augments Memory
         */
        this.removeDataRecord = function( index ) {
            if ( dataSync ) {
                data[ index ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_REMOVED;
            } else {
                data.splice( index, 1 );
            }
        };

        /**
            Returns the value of the private dataSync var
            @private
            @augments Memory
            @returns {Boolean}
         */
        this.getDataSync = function() {
            return dataSync;
        };
    };

    // Public Methods
    /**
        Read data from a store
        @param {String|Number} [id] - Usually a String or Number representing a single "record" in the data set or if no id is specified, all data is returned
        @returns {Array} Returns data from the store, optionally filtered by an id
     */
    AeroGear.DataManager.adapters.Memory.prototype.read = function( id ) {
        var filter = {};
        filter[ this.getRecordId() ] = id;
        return id ? this.filter( filter ) : this.getData();
    };

    /**
        Saves data to the store, optionally clearing and resetting the data
        @param {Object|Array} data - An object or array of objects representing the data to be saved to the server. When doing an update, one of the key/value pairs in the object to update must be the `recordId` you set during creation of the store representing the unique identifier for a "record" in the data set.
        @param {Object} [options] - Extra options to pass to save
        @param {Object} [options.noSync] - If true, do not sync this save to the server (usually used internally during a sync to avoid loops)
        @param {Boolean} [options.reset] - If true, this will empty the current data and set it to the data being saved
        @returns {Array} Returns the updated data from the store
     */
    AeroGear.DataManager.adapters.Memory.prototype.save = function( data, options ) {
        var itemFound = false;

        data = AeroGear.isArray( data ) ? data : [ data ];
        options = options || {};

        if ( options.reset ) {
            this.setData( data, true );
        } else {
            if ( this.getData() ) {
                for ( var i = 0; i < data.length; i++ ) {
                    for( var item in this.getData() ) {
                        if ( this.getData()[ item ][ this.getRecordId() ] === data[ i ][ this.getRecordId() ] ) {
                            this.updateDataRecord( item, data[ i ] );
                            itemFound = true;
                            break;
                        }
                    }
                    if ( !itemFound ) {
                        this.addDataRecord( data[ i ] );
                    }

                    itemFound = false;
                }
            } else {
                this.setData( data );
            }
        }

        if ( this.getDataSync() && !options.noSync ) {
            // Trigger custom save event
            $( document ).trigger( $.Event( "ag-sync-" + this.getName() + "-store-save", { syncData: this.getData() } ) );
        }

        return this.getData();
    };

    /**
        Removes data from the store
        @param {String|Object|Array} toRemove - A variety of objects can be passed to remove to specify the item or if nothing is provided, all data is removed
        @returns {Array} Returns the updated data from the store
     */
    AeroGear.DataManager.adapters.Memory.prototype.remove = function( toRemove ) {
        if ( !toRemove ) {
            // empty data array and return
            this.emptyData();
            return this.getData();
        } else {
            toRemove = AeroGear.isArray( toRemove ) ? toRemove : [ toRemove ];
        }
        var delId,
            data,
            item;

        for ( var i = 0; i < toRemove.length; i++ ) {
            if ( typeof toRemove[ i ] === "string" || typeof toRemove[ i ] === "number" ) {
                delId = toRemove[ i ];
            } else if ( toRemove ) {
                delId = toRemove[ i ][ this.getRecordId() ];
            } else {
                // Missing record id so just skip this item in the arrray
                continue;
            }

            data = this.getData( true );
            for( item in data ) {
                if ( data[ item ][ this.getRecordId() ] === delId ) {
                    this.removeDataRecord( item );
                }
            }
        }

        return this.getData();
    };

    /**
        Filter the current store's data
        @param {Object} [filterParameters] - An object containing key value pairs on which to filter the store's data. To filter a single parameter on multiple values, the value can be an object containing a data key with an Array of values to filter on and its own matchAny key that will override the global matchAny for that specific filter parameter.
        @param {Boolean} [matchAny] - When true, an item is included in the output if any of the filter parameters is matched.
        @returns {Array} Returns a filtered array of data objects based on the contents of the store's data object and the filter parameters. This method only returns a copy of the data and leaves the original data object intact.
     */
    AeroGear.DataManager.adapters.Memory.prototype.filter = function( filterParameters, matchAny ) {
        var filtered,
            i, j, k;

        if ( !filterParameters ) {
            filtered = this.getData() || [];
            return filtered;
        }

        filtered = this.getData().filter( function( value, index, array) {
            var match = matchAny ? false : true,
                keys = Object.keys( filterParameters ),
                filterObj, paramMatch, paramResult;

            for ( i = 0; i < keys.length; i++ ) {
                if ( filterParameters[ keys[ i ] ].data ) {
                    // Parameter value is an object
                    filterObj = filterParameters[ keys[ i ] ];
                    paramResult = filterObj.matchAny ? false : true;

                    for ( j = 0; j < filterObj.data.length; j++ ) {
                        if( AeroGear.isArray( value[ keys[ i ] ] ) ) {
                            if(value[ keys [ i ] ].length ) {
                                if( $( value[ keys ] ).not( filterObj.data ).length === 0 && $( filterObj.data ).not( value[ keys ] ).length === 0 ) {
                                    paramResult = true;
                                    break;
                                } else {
                                    for( k = 0; k < value[ keys[ i ] ].length; k++ ) {
                                        if ( filterObj.matchAny && filterObj.data[ j ] === value[ keys[ i ] ][ k ] ) {
                                            // At least one value must match and this one does so return true
                                            paramResult = true;
                                            break;
                                        }
                                        if ( !filterObj.matchAny && filterObj.data[ j ] !== value[ keys[ i ] ][ k ] ) {
                                            // All must match but this one doesn't so return false
                                            paramResult = false;
                                            break;
                                        }
                                    }
                                }
                            } else {
                                paramResult = false;
                            }
                        } else {
                            if ( filterObj.matchAny && filterObj.data[ j ] === value[ keys[ i ] ] ) {
                                // At least one value must match and this one does so return true
                                paramResult = true;
                                break;
                            }
                            if ( !filterObj.matchAny && filterObj.data[ j ] !== value[ keys[ i ] ] ) {
                                // All must match but this one doesn't so return false
                                paramResult = false;
                                break;
                            }
                        }
                    }
                } else {
                    // Filter on parameter value
                    if( AeroGear.isArray( value[ keys[ i ] ] ) ) {
                        paramResult = matchAny ? false: true;

                        if(value[ keys[ i ] ].length ) {
                            for(j = 0; j < value[ keys[ i ] ].length; j++ ) {
                                if( matchAny && filterParameters[ keys[ i ] ] === value[ keys[ i ] ][ j ]  ) {
                                    //at least one must match and this one does so return true
                                    paramResult = true;
                                    break;
                                }
                                if( !matchAny && filterParameters[ keys[ i ] ] !== value[ keys[ i ] ][ j ] ) {
                                    //All must match but this one doesn't so return false
                                    paramResult = false;
                                    break;
                                }
                            }
                        } else {
                            paramResult = false;
                        }
                    } else {
                         paramResult = filterParameters[ keys[ i ] ] === value[ keys[ i ] ] ? true : false;
                    }
                }

                if ( matchAny && paramResult ) {
                    // At least one item must match and this one does so return true
                    match = true;
                    break;
                }
                if ( !matchAny && !paramResult ) {
                    // All must match but this one doesn't so return false
                    match = false;
                    break;
                }
            }

            return match;
        });

        return filtered;
    };
})( AeroGear, jQuery, uuid );
