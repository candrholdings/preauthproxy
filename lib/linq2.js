/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, evil:false, bitwise:true, strict:true, undef:true, curly:true, devel:true, indent:4, maxerr:50, expr:true, loopfunc:true, onevar:false, browser:true, node:true */

!function (exports) {
    'use strict';

    if (!exports) {
        // This feature is not supported in the current environment.
        return;
    }

    // Each functions defined here should take up the following targets, except those intentionally not to:
    // 1. Array
    // 2. Map
    // 3. Function that returns an array/map

    var asyncArrayFunctions = {},
        asyncMapFunctions = {},
        arrayFunctions = exports.array = {
            async: asyncArrayFunctions
        },
        mapFunctions = exports.map = {
            async: asyncMapFunctions
        },
        asyncFunctions = exports.async = {
            array: asyncArrayFunctions,
            map: asyncMapFunctions
        };

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    exports.isArray = isArray;

    function likeArray(obj) {
        return typeof obj !== 'undefined' && obj !== null && typeof obj.length === 'number';
    }

    exports.likeArray = likeArray;

    function makeArray(obj) {
        return [].slice.call(obj);
    }

    exports.makeArray = makeArray;

    function isImprovised(array) {
        return isArray(array) && array.__linq__;
    }

    function keys(obj) {
        var result = [];

        if (obj) {
            for (var name in obj) {
                if (obj.hasOwnProperty(name)) {
                    result.push(name);
                }
            }
        }

        return result;
    }

    function arrayForEach(array, iterator) {
        if (!array) { return; }

        // Even though JS has its native .forEach, we want one which can break the loop
        for (var i = 0, l = array.length; i < l; i++) {
            if (iterator.call(array, array[i], i) === false) {
                break;
            }
        }
    }

    function mapForEach(map, iterator) {
        if (!map) { return; }

        arrayForEach(mapFunctions.keys(map), function (name) {
            return iterator.call(map, name, map[name]);
        });
    }

    function arrayForEachAsync(array, iterator, callback) {
        if (!array) { return callback(); }

        var arrayCopy = makeArray(array),
            index = 0,
            loop = function () {
                if (arrayCopy.length) {
                    iterator.call(array, arrayCopy.shift(), index++, function (err, continueLoop) {
                        if (err) {
                            callback(err);
                        } else if (continueLoop === false) {
                            callback();
                        } else {
                            loop();
                        }
                    });
                } else {
                    callback();
                }
            };

        loop();
    }

    function mapForEachAsync(map, iterator, callback) {
        if (!map) { return callback(); }

        var names = keys(map),
            loop = function () {
                if (names.length) {
                    var name = names.shift();

                    iterator.call(map, name, map[name], function (err, continueLoop) {
                        if (err) {
                            callback(err);
                        } else if (continueLoop === false) {
                            callback();
                        } else {
                            loop();
                        }
                    });
                } else {
                    callback();
                }
            };

        loop();
    }

    var functions = {};

    functions.keys = {
        improviseResult: true,
        array: function (array) {
            var result = [];

            if (array) {
                for (var i = 0, l = array.length; i < l; i++) {
                    result.push(i);
                }
            }

            return result;
        },
        map: keys,
        async: {
            array: function (array, callback) {
                callback(null, functions.keys.array(array));
            },
            map: function (map, callback) {
                callback(null, keys(map));
            }
        }
    };

    functions.forEach = {
        array: arrayForEach,
        map: mapForEach,
        async: {
            array: arrayForEachAsync,
            map: mapForEachAsync
        }
    };

    functions.where = {
        improviseResult: true,
        array: function (array, filter) {
            if (!array) { return array; }

            var result = [];

            arrayForEach(array, function (item, index) {
                (filter ? filter.call(array, item, index) : typeof item !== 'undefined') && result.push(item);
            });

            return result;
        },
        map: function (map, filter) {
            if (!map) { return map; }

            var result = {};

            mapForEach(map, function (name, value) {
                if (filter.call(map, name, value)) {
                    result[name] = value;
                }
            });

            return result;
        },
        async: {
            array: function (array, filter, callback) {
                if (!array) { return callback(null, array); }

                var result = [];

                arrayForEachAsync(array, function (item, index, callback) {
                    filter.call(array, item, index, function (err, include) {
                        !err && include && result.push(item);
                        callback(err);
                    });
                }, function (err) {
                    callback(err, err ? null : result);
                });
            },
            map: function (map, filter, callback) {
                if (!map) { return callback(null, map); }

                var result = {};

                mapForEachAsync(map, function (name, value, callback) {
                    filter.call(map, name, value, function (err, include) {
                        if (!err && include) {
                            result[name] = value;
                        }

                        callback(err);
                    });
                }, function (err) {
                    callback(err, err ? null : result);
                });
            }
        }
    };

    functions.any = {
        array: function (array, filter) {
            if (!filter) {
                return array && !!array.length;
            } else {
                var result;

                arrayForEach(array, function (item) {
                    if (filter.call(array, item)) {
                        result = true;

                        return false;
                    }
                });

                return !!result;
            }
        },
        map: function (map, filter) {
            var result;

            for (var name in map) {
                if (map.hasOwnProperty(name) && (!filter || filter.call(map, name, map[name]))) {
                    return true;
                }
            }

            return false;
        },
        async: {
            array: function (array, filter, callback) {
                if (!array) {
                    callback(null, false);
                } else if (!filter) {
                    callback(null, array && !!array.length);
                } else {
                    var arrayCopy = makeArray(array),
                        index = 0,
                        loop = function () {
                            if (arrayCopy.length) {
                                filter.call(array, arrayCopy.shift(), index++, function (err, result) {
                                    if (err) {
                                        callback(err);
                                    } else if (result) {
                                        callback(null, true);
                                    } else {
                                        loop();
                                    }
                                });
                            } else {
                                callback(null, false);
                            }
                        };

                    loop();
                }
            },
            map: function (map, filter, callback) {
                if (!map) {
                    callback(null, false);
                } else if (!filter) {
                    callback(null, functions.any.map(map));
                } else {
                    var names = keys(map),
                        loop = function () {
                            if (names.length) {
                                var name = names.shift();

                                filter.call(map, name, map[name], function (err, result) {
                                    if (err) {
                                        callback(err);
                                    } else if (result) {
                                        callback(null, true);
                                    } else {
                                        loop();
                                    }
                                });
                            } else {
                                callback(null, false);
                            }
                        };

                    loop();
                }
            }
        }
    };

    functions.select = {
        improviseResult: true,
        array: function (array, transform) {
            if (!array) { return array; }

            var result = new Array(array.length);

            arrayForEach(array, function (value, index) {
                result[index] = transform ? transform.call(array, value, index) : value;
            });

            return result;
        },
        map: function (map, transform) {
            if (!map) { return map; }

            var result = {};

            mapForEach(map, function (name, value) {
                result[name] = transform ? transform.call(map, name, value) : value;
            });

            return result;
        },
        async: {
            array: function (array, transform, callback) {
                if (!array) { return callback(null, array); }

                var arrayCopy = makeArray(array);

                if (!transform) { return callback(null, arrayCopy); }

                var index = 0,
                    result = [],
                    loop = function () {
                        if (arrayCopy.length) {
                            transform.call(array, arrayCopy.shift(), index++, function (err, transformed) {
                                if (err) {
                                    callback(err);
                                } else {
                                    result.push(transformed);
                                    loop();
                                }
                            });
                        } else {
                            callback(null, result);
                        }
                    };

                loop();
            },
            map: function (map, transform, callback) {
                if (!map) {
                    return callback(null, map);
                } else if (!transform) {
                    return callback(null, functions.select.map(map));
                }

                var names = keys(map),
                    result = {},
                    loop = function () {
                        if (names.length) {
                            var name = names.shift();

                            transform.call(map, name, map[name], function (err, transformed) {
                                if (err) {
                                    callback(err);
                                } else {
                                    result[name] = transformed;
                                    loop();
                                }
                            });
                        } else {
                            callback(null, result);
                        }
                    };

                loop();
            }
        }
    };

    functions.first = {
        array: function (array, evaluator) {
            if (array) {
                if (typeof evaluator !== 'undefined') {
                    var isFunc = typeof evaluator === 'function';

                    for (var i = 0, l = array.length, item; i < l; i++) {
                        if (isFunc ? evaluator.call(array, (item = array[i]), i) : item === evaluator) {
                            return item;
                        }
                    }
                } else {
                    return array[0];
                }
            }
        },
        map: function (map, evaluator) {
            if (map) {
                var name, value;

                for (name in map) {
                    if (map.hasOwnProperty(name)) {
                        var value = map[name];

                        if (typeof evaluator === 'function' ? evaluator.call(map, name, value) : value === evaluator) {
                            return name;
                        }
                    }
                }
            }
        },
        async: {
            array: function (array, evaluator, callback) {
                if (!array) {
                    callback.call(array);
                } else if (typeof evaluator !== 'undefined') {
                    var found, foundIndex, foundItem;

                    arrayForEachAsync(
                        array,
                        function (item, index, callback) {
                            evaluator.call(array, item, index, function (err, result) {
                                if (err) {
                                    callback(err);
                                } else if (result) {
                                    found = true;
                                    foundIndex = index;
                                    foundItem = item;
                                    callback(null, false);
                                } else {
                                    callback();
                                }
                            });
                        },
                        function (err) {
                            if (err) {
                                callback.call(array, err);
                            } else if (found) {
                                callback.call(array, null, foundItem, foundIndex);
                            } else {
                                callback.call(array);
                            }
                        }
                    );
                } else if (array.length) {
                    callback.call(array, null, array[0], 0);
                } else {
                    callback.call(array);
                }
            },
            map: function (map, evaluator, callback) {
                if (map) {
                    var foundName;

                    mapForEachAsync(
                        map,
                        function (name, value, callback) {
                            if (typeof evaluator === 'function') {
                                evaluator.call(map, name, value, function (err, result) {
                                    if (err) {
                                        callback(err);
                                    } else if (result) {
                                        foundName = name;
                                        callback(null, false);
                                    } else {
                                        callback();
                                    }
                                });
                            } else if (evaluator === value) {
                                foundName = name;
                                callback(null, false);
                            } else {
                                callback();
                            }
                        },
                        function (err) {
                            if (err) {
                                callback.call(map, err);
                            } else if (foundName) {
                                callback.call(map, null, foundName, map[foundName]);
                            } else {
                                callback.call(map);
                            }
                        }
                    );
                } else {
                    callback.call(map);
                }
            }
        }
    };

    function arrayMax(array, valuation, comparer) {
        if (array && valuation) {
            var maxWeight, maxItem;

            arrayForEach(array, function (item, index) {
                var weight = valuation.call(array, item),
                    weightType = typeof weight;

                if ((weightType === 'number' || weightType === 'string' || weightType === 'boolean') && (typeof maxWeight === 'undefined' || comparer(weight, maxWeight))) {
                    maxWeight = weight;
                    maxItem = item;
                }
            });

            return maxItem;
        }
    }

    function mapMax(map, valuation, comparer) {
        if (map && valuation) {
            var maxName, maxWeight;

            mapForEach(map, function (name, value) {
                var weight = valuation.call(map, name, value),
                    weightType = typeof weight;

                if ((weightType === 'number' || weightType === 'string' || weightType === 'boolean') && (typeof maxWeight === 'undefined' || comparer(weight, maxWeight))) {
                    maxWeight = weight;
                    maxName = name;
                }
            });

            return maxName;
        }
    }

    function arrayMaxAsync(array, valuation, comparer, callback) {
        if (array && valuation) {
            var maxWeight, maxItem;

            arrayForEachAsync(array, function (item, index, callback) {
                valuation.call(array, item, index, function (err, weight) {
                    if (!err) {
                        var weightType = typeof weight;

                        if ((weightType === 'number' || weightType === 'string' || weightType === 'boolean') && (typeof maxWeight === 'undefined' || comparer(weight, maxWeight))) {
                            maxWeight = weight;
                            maxItem = item;
                        }
                    }

                    callback(err);
                });
            }, function (err) {
                callback.call(array, err, err ? null : maxItem);
            });
        } else {
            callback();
        }
    }

    function mapMaxAsync(map, valuation, comparer, callback) {
        if (map && valuation) {
            var maxName, maxWeight;

            mapForEachAsync(map, function (name, value, callback) {
                valuation.call(map, name, value, function (err, weight) {
                    if (!err) {
                        var weightType = typeof weight;

                        if ((weightType === 'number' || weightType === 'string' || weightType === 'boolean') && (typeof maxWeight === 'undefined' || comparer(weight, maxWeight))) {
                            maxWeight = weight;
                            maxName = name;
                        }
                    }

                    callback(err);
                });
            }, function (err) {
                if (err) {
                    callback.call(map, err);
                } else {
                    callback.call(map, null, maxName, map[maxName]);
                }
            });
        } else {
            callback();
        }
    }

    functions.max = {
        array: function (array, valuation) {
            return arrayMax(array, valuation, function (x, y) { return x > y; });
        },
        map: function (map, valuation) {
            return mapMax(map, valuation, function (x, y) { return x > y; });
        },
        async: {
            array: function (array, valuation, callback) {
                return arrayMaxAsync(array, valuation, function (x, y) { return x > y; }, callback);
            },
            map: function (map, valuation, callback) {
                return mapMaxAsync(map, valuation, function (x, y) { return x > y; }, callback);
            }
        }
    };

    functions.min = {
        array: function (array, valuation) {
            return arrayMax(array, valuation, function (x, y) { return x < y; });
        },
        map: function (map, valuation) {
            return mapMax(map, valuation, function (x, y) { return x < y; });
        },
        async: {
            array: function (array, valuation, callback) {
                return arrayMaxAsync(array, valuation, function (x, y) { return x < y; }, callback);
            },
            map: function (map, valuation, callback) {
                return mapMaxAsync(map, valuation, function (x, y) { return x < y; }, callback);
            }
        }
    };

    functions.selectMany = {
        improviseResult: true,
        array: function (array, collect, select) {
            if (!array) { return array; }

            var result = [];

            arrayForEach(array, function (item, index) {
                var subarray = collect ? collect.call(array, item, index) : item;

                if (!likeArray(subarray)) {
                    throw new Error('"collect" function must return an array or array-like object');
                }

                arrayForEach(subarray, function (item, index) {
                    result.push(select ? select.call(array, item, index) : item);
                });
            });

            return result;
        },
        map: function (map, collect, select) {
            if (!map) { return map; }

            var result = {};

            mapForEach(map, function (name, value) {
                var submap = collect ? collect.call(map, name, value) : value;

                mapForEach(submap, function (name, value) {
                    result[name] = select ? select.call(map, name, value) : value;
                });
            });

            return result;
        },
        async: {
            array: function (array, collect, select, callback) {
                if (!array) { return callback(null, array); }

                var result = [];

                collect = collect || function (item, index, callback) {
                    callback(null, item);
                };

                select = select || function (item, index, callback) {
                    callback(null, item);
                };

                arrayForEachAsync(array, function (item, index, callback) {
                    collect.call(array, item, index, function (err, subarray) {
                        if (err) {
                            callback(err);
                        } else if (!likeArray(subarray)) {
                            callback(new Error('"collect" function must return an array or array-like object'));
                        } else {
                            arrayForEachAsync(subarray, function (item, index, callback) {
                                select.call(array, item, index, function (err, subresult) {
                                    !err && result.push(subresult);
                                    callback(err);
                                });
                            }, callback);
                        }
                    });
                }, function (err) {
                    callback(err, err ? null : result);
                });
            },
            map: function (map, collect, select, callback) {
                if (!map) { return callback(null, map); }

                var result = {};

                collect = collect || function (name, value, callback) {
                    callback(null, value);
                };

                select = select || function (name, value, callback) {
                    callback(null, value);
                };

                mapForEachAsync(map, function (name, value, callback) {
                    collect.call(map, name, value, function (err, submap) {
                        if (err) {
                            callback(err);
                        } else {
                            mapForEachAsync(submap, function (name, value, callback) {
                                select.call(map, name, value, function (err, subresult) {
                                    if (!err) { result[name] = subresult; }

                                    callback(err);
                                });
                            }, callback);
                        }
                    });
                }, function (err) {
                    callback(err, err ? null : result);
                });
            }
        }
    };

    function arrayTake(array, count) {
        if (!array) { return array; }

        var offset = count < 0 ? Math.max(0, array.length + count) : 0,
            result = new Array((count = Math.min(array.length, Math.abs(count)))),
            index = 0;

        for (; index < count; index++) {
            result[index] = array[index + offset];
        }

        return result;
    }

    functions.take = {
        improviseResult: true,
        array: arrayTake,
        async: {
            array: function (array, count, callback) {
                callback && callback.call(array, null, arrayTake(array, count));
            }
        }
    };

    function arraySkip(array, count) {
        if (!array) { return array; }

        var result = new Array(Math.max(0, array.length - Math.abs(count))),
            offset = count > 0 ? array.length - result.length : 0,
            index = 0;

        count = result.length;

        for (; index < count; index++) {
            result[index] = array[index + offset];
        }

        return result;
    }

    functions.skip = {
        improviseResult: true,
        array: arraySkip,
        async: {
            array: function (array, count, callback) {
                callback && callback.call(array, null, arraySkip(array, count));
            }
        }
    };

    functions.all = {
        array: function (array, evaluator) {
            if (!array || !evaluator) { return true; }

            var result;

            arrayForEach(array, function (item, index) {
                if (!evaluator.call(array, item, index)) {
                    return !(result = true);
                }
            });

            return !result;
        },
        map: function (map, evaluator) {
            if (!map || !evaluator) { return true; }

            var result;

            mapForEach(map, function (name, value) {
                if (!evaluator.call(map, name, value)) {
                    return !(result = true);
                }
            });

            return !result;
        },
        async: {
            array: function (array, evaluator, callback) {
                if (!array || !evaluator) { return callback(null, true); }

                var notAll;

                arrayForEachAsync(array, function (item, index, callback) {
                    evaluator.call(array, item, index, function (err, result) {
                        notAll = !result;
                        callback(err, err ? null : !notAll);
                    });
                }, function (err) {
                    callback(err, err ? null : !notAll);
                });
            },
            map: function (map, evaluator, callback) {
                if (!map || !evaluator) { return callback(null, true); }

                var notAll;

                mapForEachAsync(map, function (name, value, callback) {
                    evaluator.call(map, name, value, function (err, result) {
                        notAll = !result;
                        callback(err, err ? null : !notAll);
                    });
                }, function (err) {
                    callback(err, err ? null : !notAll);
                });
            }
        }
    };

    functions.count = {
        array: function (array) {
            return array ? array.length : 0;
        },
        map: function (map) {
            var count = 0;

            mapForEach(map, function () {
                count++;
            });

            return count;
        },
        async: {
            array: function (array, callback) {
                return callback.call(array, null, array ? array.length : 0);
            },
            map: function (map, callback) {
                var count = 0;

                mapForEachAsync(map, function (name, value, callback) {
                    count++;
                    callback();
                }, function (err) {
                    callback.call(map, err, err ? null : count);
                });
            }
        }
    };

    functions.last = {
        array: function (array, evaluator) {
            if (array) {
                var reversedArray = makeArray(array).reverse(),
                    countMinusOne = array.length - 1;

                return functions.first.array(reversedArray, evaluator ? function (item, index) {
                    return evaluator.call(array, item, countMinusOne - index);
                } : null);
            }
        },
        map: function (map, evaluator) {
            if (map) {
                var reversedKeys = keys(map).reverse();

                return functions.first.array(reversedKeys, evaluator ? function (key) {
                    return evaluator.call(map, key, map[key]);
                } : null);
            }
        },
        async: {
            array: function (array, evaluator, callback) {
                if (array) {
                    var reversedArray = makeArray(array).reverse(),
                        countMinusOne = array.length - 1;

                    functions.first.async.array(reversedArray, evaluator ? function (item, index, callback) {
                        evaluator.call(array, item, countMinusOne - index, callback);
                    } : null, function (err, item, index) {
                        if (callback) {
                            if (err) {
                                callback.call(array, err);
                            } else {
                                callback.call(array, null, item, countMinusOne - index);
                            }
                        }
                    });
                } else {
                    callback.call(array);
                }
            },
            map: function (map, evaluator, callback) {
                if (map) {
                    var reversedKeys = keys(map).reverse();

                    functions.first.async.array(reversedKeys, evaluator ? function (key, index, callback) {
                        evaluator.call(map, key, map[key], callback);
                    } : null, function (err, key) {
                        if (callback) {
                            if (err) {
                                callback.call(map, err);
                            } else {
                                callback.call(map, null, key, map[key]);
                            }
                        }
                    });
                } else {
                    callback.call(map);
                }
            }
        }
    };

    function arrayReverse(array) {
        return array ? [].slice.call(array).reverse() : array;
    }

    functions.reverse = {
        improviseResult: true,
        array: function (array) {
            return arrayReverse(array);
        },
        async: {
            array: function (array, callback) {
                callback.call(array, null, arrayReverse(array));
            }
        }
    };

    functions.values = {
        map: function (map, fn) {
            if (!map) { return map; }

            var result = [];

            mapForEach(map, function (name, value) {
                result.push(fn ? fn.call(map, name, value) : value);
            });

            return result;
        },
        async: {
            map: function (map, fn, callback) {
                if (!map) { return map; }

                if (arguments.length === 2) {
                    callback = fn;
                    fn = null;
                }

                var result = [];

                mapForEachAsync(map, function (name, value, callback) {
                    if (fn) {
                        fn.call(map, name, value, function (err, value) {
                            !err && result.push(value);
                            callback(err);
                        });
                    } else {
                        result.push(value);
                        callback();
                    }
                }, function (err) {
                    callback.call(map, err, err ? null : result);
                });
            }
        }
    };

    functions.orderBy = {
        improviseResult: true,
        array: function (array, valuation) {
            if (!array) { return array; }

            var i = 0,
                l = array.length,
                values = new Array(l),
                item;

            for (; i < l; i++) {
                item = array[i];
                values[i] = {
                    value: valuation ? valuation.call(array, item) : item,
                    index: i
                };
            }

            values.sort(function (x, y) {
                x = x.value;
                y = y.value;

                return x > y ? 1 : x < y ? -1 : 0;
            });

            return functions.select.array(values, function (value) {
                return array[value.index];
            });
        },
        async: {
            array: function (array, valuation, callback) {
                if (!array) { return callback(null, array); }

                if (!valuation) { return callback.call(array, null, functions.orderBy.array(array)); }

                var values = new Array(array.length);

                arrayForEachAsync(array, function (item, index, callback) {
                    valuation.call(array, item, index, function (err, value) {
                        if (err) { return callback(err); }

                        values[index] = {
                            value: value,
                            index: index
                        };

                        callback();
                    });
                }, function (err) {
                    if (err) { return callback.call(array, err); }

                    values.sort(function (x, y) {
                        x = x.value;
                        y = y.value;

                        return x > y ? 1 : x < y ? -1 : 0;
                    });

                    callback.call(array, null, functions.select.array(values, function (value) {
                        return array[value.index];
                    }));
                });
            }
        }
    };

    functions.orderByDescending = {
        improviseResult: true,
        array: function (array, sorter) {
            return array && functions.orderBy(array).reverse();
        }

        // TODO: async version
    };

    functions.toDictionary = {
        array: function (array, keyFunction) {
            if (array) {
                var result = {};

                arrayForEach(array, function (item, index) {
                    result[keyFunction ? keyFunction.call(array, item, index) : item] = item;
                });

                return result;
            }
        },
        async: {
            array: function (array, keyFunction, callback) {
                if (!array) { return callback.call(array); }

                if (!keyFunction) { return callback.call(array, null, functions.toDictionary.array(array, keyFunction)); }

                var result = {};

                arrayForEachAsync(array, function (item, index, callback) {
                    keyFunction.call(array, item, index, function (err, key) {
                        if (!err) {
                            result[key] = item;
                        }

                        callback(err);
                    });
                }, function (err) {
                    callback.call(array, err, err ? null : result);
                });
            }
        }
    };

    functions.groupBy = {
        array: function (array, keyFunction) {
            if (array) {
                var result = {};

                arrayForEach(array, function (item, index) {
                    var key = keyFunction ? keyFunction.call(array, item, index) : (item + '');

                    (result[key] = result[key] || []).push(item);
                });

                return result;
            }
        },
        map: function (map, keyFunction) {
            if (map) {
                var result = {};

                mapForEach(map, function (name, value) {
                    var key = keyFunction ? keyFunction.call(map, name, value) : name;

                    (result[key] = result[key] || {})[name] = value;
                });

                return result;
            }
        },
        async: {
            array: function (array, keyFunction, callback) {
                if (!array) { return callback.call(array); }

                if (!keyFunction) { return callback.call(array, null, functions.groupBy.array(array)); }

                var result = {};

                arrayForEachAsync(array, function (item, index, callback) {
                    keyFunction.call(array, item, index, function (err, key) {
                        if (!err) {
                            (result[key] = result[key] || []).push(item);
                        }

                        callback(err);
                    });
                }, function (err) {
                    callback.call(array, err, err ? null : result);
                });
            },
            map: function (map, keyFunction, callback) {
                if (!map) { return callback.call(map); }

                if (!keyFunction) { return callback.call(map, null, functions.groupBy.map(map)); }

                var result = {};

                mapForEachAsync(map, function (name, value, callback) {
                    keyFunction.call(map, name, value, function (err, key) {
                        if (!err) {
                            (result[key] = result[key] || [])[name] = value;
                        }

                        callback(err);
                    });
                }, function (err) {
                    callback.call(map, err, err ? null : result);
                });
            }
        }
    };

    functions.concat = {
        array: function () {
            var result = [];

            arrayForEach(arguments, function (array) {
                if (typeof array === 'function') {
                    array = array();
                }

                arrayForEach(array, function (item) {
                    result.push(item);
                });
            });

            return result;
        },
        map: function () {
            var result = {};

            arrayForEach(arguments, function (map) {
                if (typeof map === 'function') {
                    map = map();
                }

                mapForEach(map, function (name, value) {
                    result[name] = value;
                });
            });

            return result;
        }
    };

    functions.takeWhile = {
        improviseResult: true,
        array: function (array, whileFn) {
            var newArray = [],
                whileFnIsFunction = typeof whileFn === 'function';

            arrayForEach(array, function (item, index) {
                if (whileFnIsFunction) {
                    if (!whileFn.call(array, item, index)) {
                        return false;
                    }
                } else {
                    if (whileFn !== item) {
                        return false;
                    }
                }

                newArray.push(item);
            });

            return newArray;
        },
        async: {
            array: function (array, whileFn, callback) {
                var newArray = [];

                if (typeof whileFn === 'function') {
                    arrayForEachAsync(array, function (item, index, callback) {
                        whileFn.call(array, item, index, function (err, included) {
                            if (err) {
                                callback(err);
                            } else {
                                included && newArray.push(item);
                                callback(null, included);
                            }
                        });
                    }, function (err) {
                        callback.call(array, err, err ? null : newArray);
                    });
                } else {
                    try {
                        newArray = functions.takeWhile.array(array, whileFn);
                    } catch (ex) {
                        return callback.call(array, ex);
                    }

                    callback.call(array, null, newArray);
                }
            }
        }
    };

    functions.skipWhile = {
        improviseResult: true,
        array: function (array, whileFn) {
            var skipIndex = 0,
                isFunc = typeof whileFn === 'function';

            arrayForEach(array, function (item, index) {
                if ((isFunc && !whileFn.call(array, item, index)) ||
                    (!isFunc && whileFn !== item)) {
                    skipIndex = index;

                    return false;
                }
            });

            return array.slice(skipIndex);
        },
        async: {
            array: function (array, whileFn, callback) {
                var skipIndex = 0,
                    isFunc = typeof whileFn === 'function';

                arrayForEachAsync(array, function (item, index, callback) {
                    if (isFunc) {
                        whileFn.call(array, item, index, function (err, result) {
                            if (err) {
                                callback.call(array, err);
                            } else {
                                if (!result) {
                                    skipIndex = index;
                                }

                                callback.call(array, null, result);
                            }
                        });
                    } else {
                        if (item !== whileFn) {
                            skipIndex = index;
                            callback(null, false);
                        }
                    }
                }, function (err) {
                    callback.call(array, err, err ? null : array.slice(skipIndex));
                });
            }
        }
    };

    // orderBy/thenBy+Descending
    // reverse
    // distinct
    // union
    // intersect
    // except
    // toList
    // elementAt
    // range
    // repeat
    // sum
    // average
    // aggregate
    // sequenceEqual
    // combine (dot product)

    // removeFirst
    // diff

    // dedupe(array, hashFn)
    // randomize
    // trimEnd

    // Register for functions
    function register() {
        arrayForEach(keys(functions), function (name) {
            var fn = functions[name],
                arrayFn = fn.array,
                mapFn = fn.map,
                async = fn.async || {},
                arrayAsyncFn = async.array,
                mapAsyncFn = async.map;

            if (arrayFn || mapFn) {
                exports[name] = function () {
                    return resolveObjAndCall(makeArray(arguments), function (obj) {
                        return (isArray(obj) ? arrayFn || mapFn : mapFn || arrayFn).apply(null, arguments);
                    });
                };

                if (arrayFn) {
                    arrayFunctions[name] = function () {
                        return resolveObjAndCall(makeArray(arguments), arrayFn);
                    };
                }

                if (mapFn) {
                    mapFunctions[name] = function (obj) {
                        return resolveObjAndCall(makeArray(arguments), mapFn);
                    };
                }
            }

            if (arrayAsyncFn || mapAsyncFn) {
                exports.async[name] = function () {
                    return resolveObjAndCallAsync(makeArray(arguments), function (obj) {
                        return (isArray(obj) ? arrayAsyncFn || mapAsyncFn : mapAsyncFn || arrayAsyncFn).apply(null, arguments);
                    });
                };

                if (arrayAsyncFn) {
                    asyncArrayFunctions[name] = function () {
                        return resolveObjAndCallAsync(makeArray(arguments), arrayAsyncFn);
                    };
                }

                if (mapAsyncFn) {
                    asyncMapFunctions[name] = function () {
                        return resolveObjAndCallAsync(makeArray(arguments), mapAsyncFn);
                    };
                }
            }
        });
    }

    function resolveObjAndCall(args, fn) {
        var obj = args[0];

        if (typeof obj === 'function') {
            args[0] = obj = obj();
        }

        return fn.apply(null, args);
    }

    function resolveObjAndCallAsync(args, fn) {
        var obj = args[0];

        if (typeof obj === 'function') {
            obj(function (err, obj) {
                if (err) {
                    args[args.length - 1](err);
                } else {
                    args[0] = obj;
                    return fn.apply(null, args);
                }
            });
        } else {
            return fn.apply(null, args);
        }
    }

    functions.improvise = {
        array: improvise
    };

    function improvise(array) {
        if (array === null || typeof array === 'undefined') {
            return array;
        } else if (!likeArray(array)) {
            throw new Error('Only array can be improvised');
        }

        array = makeArray(array);

        if (!array.__linq__) {
            if (typeof array.async !== 'undefined') {
                throw new Error('array already has "async" defined, cannot be improvised');
            }

            var arrayAsync = array.async = {};

            mapForEach(functions, function (name, fns) {
                var arrayFn = fns.array,
                    asyncFns = fns.async,
                    asyncFn = asyncFns ? asyncFns.array : null;

                if (arrayFn) {
                    if (name === 'concat' || name === 'forEach' || name === 'reverse' || typeof array[name] === 'undefined') {
                        array[name] = function () {
                            var args = makeArray(arguments),
                                result;

                            args.unshift(array);
                            result = arrayFn.apply(array, args);

                            // We cannot improvise everything automatically
                            // E.g. if first() returns an array, the result should not be improvised automatically
                            // There is no way to guess what can be improvised or not, therefore we have a switch

                            return fns.improviseResult && likeArray(result) ? improvise(result) : result;
                        };
                    } else {
                        throw new Error('array already has "' + name + '" defined, cannot be improvised');
                    }
                }

                if (asyncFn) {
                    arrayAsync[name] = function () {
                        var args = makeArray(arguments),
                            callback = args.pop();

                        args.unshift(array);
                        args.push(function (err, result) {
                            if (err) { return callback(err); }

                            var args = makeArray(arguments);

                            if (fns.improviseResult && likeArray(result)) {
                                args[1] = improvise(result);
                            }

                            callback.apply(this, args);
                        });

                        resolveObjAndCallAsync(args, asyncFn);
                    };
                }
            });

            array.__linq__ = 1;
        }

        return array;
    }
    register();
}(
    typeof window !== 'undefined' ? (window.ztom = window.ztom || {}).linq = {} :
    typeof module !== 'undefined' ? module.exports :
    null);