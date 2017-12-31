(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;require.register("fs", function(exports, require, module) {
  module.exports = {};
});
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};

require.register("axios/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    module.exports = require('./lib/axios');
  })();
});

require.register("axios/lib/adapters/xhr.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if ('development' !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};
  })();
});

require.register("axios/lib/axios.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
  })();
});

require.register("axios/lib/cancel/Cancel.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;
  })();
});

require.register("axios/lib/cancel/CancelToken.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;
  })();
});

require.register("axios/lib/cancel/isCancel.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};
  })();
});

require.register("axios/lib/core/Axios.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);
  config.method = config.method.toLowerCase();

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
  })();
});

require.register("axios/lib/core/InterceptorManager.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;
  })();
});

require.register("axios/lib/core/createError.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};
  })();
});

require.register("axios/lib/core/dispatchRequest.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};
  })();
});

require.register("axios/lib/core/enhanceError.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
};
  })();
});

require.register("axios/lib/core/settle.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};
  })();
});

require.register("axios/lib/core/transformData.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};
  })();
});

require.register("axios/lib/defaults.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;
  })();
});

require.register("axios/lib/helpers/bind.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};
  })();
});

require.register("axios/lib/helpers/btoa.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;
  })();
});

require.register("axios/lib/helpers/buildURL.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};
  })();
});

require.register("axios/lib/helpers/combineURLs.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};
  })();
});

require.register("axios/lib/helpers/cookies.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);
  })();
});

require.register("axios/lib/helpers/isAbsoluteURL.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};
  })();
});

require.register("axios/lib/helpers/isURLSameOrigin.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);
  })();
});

require.register("axios/lib/helpers/normalizeHeaderName.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};
  })();
});

require.register("axios/lib/helpers/parseHeaders.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};
  })();
});

require.register("axios/lib/helpers/spread.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};
  })();
});

require.register("axios/lib/utils.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "axios");
  (function() {
    'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};
  })();
});

require.register("equals/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "equals");
  (function() {
    var type = require('jkroso-type')

// (any, any, [array]) -> boolean
function equal(a, b, memos){
  // All identical values are equivalent
  if (a === b) return true
  var fnA = types[type(a)]
  var fnB = types[type(b)]
  return fnA && fnA === fnB
    ? fnA(a, b, memos)
    : false
}

var types = {}

// (Number) -> boolean
types.number = function(a, b){
  return a !== a && b !== b/*Nan check*/
}

// (function, function, array) -> boolean
types['function'] = function(a, b, memos){
  return a.toString() === b.toString()
    // Functions can act as objects
    && types.object(a, b, memos)
    && equal(a.prototype, b.prototype)
}

// (date, date) -> boolean
types.date = function(a, b){
  return +a === +b
}

// (regexp, regexp) -> boolean
types.regexp = function(a, b){
  return a.toString() === b.toString()
}

// (DOMElement, DOMElement) -> boolean
types.element = function(a, b){
  return a.outerHTML === b.outerHTML
}

// (textnode, textnode) -> boolean
types.textnode = function(a, b){
  return a.textContent === b.textContent
}

// decorate `fn` to prevent it re-checking objects
// (function) -> function
function memoGaurd(fn){
  return function(a, b, memos){
    if (!memos) return fn(a, b, [])
    var i = memos.length, memo
    while (memo = memos[--i]) {
      if (memo[0] === a && memo[1] === b) return true
    }
    return fn(a, b, memos)
  }
}

types['arguments'] =
types['bit-array'] =
types.array = memoGaurd(arrayEqual)

// (array, array, array) -> boolean
function arrayEqual(a, b, memos){
  var i = a.length
  if (i !== b.length) return false
  memos.push([a, b])
  while (i--) {
    if (!equal(a[i], b[i], memos)) return false
  }
  return true
}

types.object = memoGaurd(objectEqual)

// (object, object, array) -> boolean
function objectEqual(a, b, memos) {
  if (typeof a.equal == 'function') {
    memos.push([a, b])
    return a.equal(b, memos)
  }
  var ka = getEnumerableProperties(a)
  var kb = getEnumerableProperties(b)
  var i = ka.length

  // same number of properties
  if (i !== kb.length) return false

  // although not necessarily the same order
  ka.sort()
  kb.sort()

  // cheap key test
  while (i--) if (ka[i] !== kb[i]) return false

  // remember
  memos.push([a, b])

  // iterate again this time doing a thorough check
  i = ka.length
  while (i--) {
    var key = ka[i]
    if (!equal(a[key], b[key], memos)) return false
  }

  return true
}

// (object) -> array
function getEnumerableProperties (object) {
  var result = []
  for (var k in object) if (k !== 'constructor') {
    result.push(k)
  }
  return result
}

module.exports = equal
  })();
});

require.register("is-buffer/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "is-buffer");
  (function() {
    /*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}
  })();
});

require.register("jkroso-type/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jkroso-type");
  (function() {
    var toString = {}.toString
var DomNode = typeof window != 'undefined'
  ? window.Node
  : Function // could be any function

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = exports = function type(x){
  var type = typeof x
  if (type != 'object') return type
  type = types[toString.call(x)]
  if (type == 'object') {
    // in case they have been polyfilled
    if (x instanceof Map) return 'map'
    if (x instanceof Set) return 'set'
    return 'object'
  }
  if (type) return type
  if (x instanceof DomNode) switch (x.nodeType) {
    case 1:  return 'element'
    case 3:  return 'text-node'
    case 9:  return 'document'
    case 11: return 'document-fragment'
    default: return 'dom-node'
  }
}

var types = exports.types = {
  '[object Function]': 'function',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Arguments]': 'arguments',
  '[object Array]': 'array',
  '[object Set]': 'set',
  '[object String]': 'string',
  '[object Null]': 'null',
  '[object Undefined]': 'undefined',
  '[object Number]': 'number',
  '[object Boolean]': 'boolean',
  '[object Object]': 'object',
  '[object Map]': 'map',
  '[object Text]': 'text-node',
  '[object Uint8Array]': 'bit-array',
  '[object Uint16Array]': 'bit-array',
  '[object Uint32Array]': 'bit-array',
  '[object Uint8ClampedArray]': 'bit-array',
  '[object Error]': 'error',
  '[object FormData]': 'form-data',
  '[object File]': 'file',
  '[object Blob]': 'blob'
}
  })();
});

require.register("jsedn/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    module.exports = require("./lib/reader.js");
  })();
});

require.register("jsedn/lib/atPath.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var kw;

  kw = require("./atoms").kw;

  module.exports = function(obj, path) {
    var part, value, _i, _len;
    path = path.trim().replace(/[ ]{2,}/g, ' ').split(' ');
    value = obj;
    for (_i = 0, _len = path.length; _i < _len; _i++) {
      part = path[_i];
      if (part[0] === ":") {
        part = kw(part);
      }
      if (value.exists) {
        if (value.exists(part) != null) {
          value = value.at(part);
        } else {
          throw "Could not find " + part;
        }
      } else {
        throw "Not a composite object";
      }
    }
    return value;
  };

}).call(this);
  })();
});

require.register("jsedn/lib/atoms.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var BigInt, Char, Discard, Keyword, Prim, StringObj, Symbol, bigInt, char, charMap, kw, memo, sym, type,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  type = require("./type");

  memo = require("./memo");

  Prim = (function() {

    function Prim(val) {
      var x;
      if (type(val) === "array") {
        this.val = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = val.length; _i < _len; _i++) {
            x = val[_i];
            if (!(x instanceof Discard)) {
              _results.push(x);
            }
          }
          return _results;
        })();
      } else {
        this.val = val;
      }
    }

    Prim.prototype.value = function() {
      return this.val;
    };

    Prim.prototype.toString = function() {
      return JSON.stringify(this.val);
    };

    return Prim;

  })();

  BigInt = (function(_super) {

    __extends(BigInt, _super);

    function BigInt() {
      return BigInt.__super__.constructor.apply(this, arguments);
    }

    BigInt.prototype.ednEncode = function() {
      return this.val;
    };

    BigInt.prototype.jsEncode = function() {
      return this.val;
    };

    BigInt.prototype.jsonEncode = function() {
      return {
        BigInt: this.val
      };
    };

    return BigInt;

  })(Prim);

  StringObj = (function(_super) {

    __extends(StringObj, _super);

    function StringObj() {
      return StringObj.__super__.constructor.apply(this, arguments);
    }

    StringObj.prototype.toString = function() {
      return this.val;
    };

    StringObj.prototype.is = function(test) {
      return this.val === test;
    };

    return StringObj;

  })(Prim);

  charMap = {
    newline: "\n",
    "return": "\r",
    space: " ",
    tab: "\t",
    formfeed: "\f"
  };

  Char = (function(_super) {

    __extends(Char, _super);

    Char.prototype.ednEncode = function() {
      return "\\" + this.val;
    };

    Char.prototype.jsEncode = function() {
      return charMap[this.val] || this.val;
    };

    Char.prototype.jsonEncode = function() {
      return {
        Char: this.val
      };
    };

    function Char(val) {
      if (charMap[val] || val.length === 1) {
        this.val = val;
      } else {
        throw "Char may only be newline, return, space, tab, formfeed or a single character - you gave [" + val + "]";
      }
    }

    return Char;

  })(StringObj);

  Discard = (function() {

    function Discard() {}

    return Discard;

  })();

  Symbol = (function(_super) {

    __extends(Symbol, _super);

    Symbol.prototype.validRegex = /[0-9A-Za-z.*+!\-_?$%&=:#/]+/;

    Symbol.prototype.invalidFirstChars = [":", "#", "/"];

    Symbol.prototype.valid = function(word) {
      var _ref, _ref1, _ref2;
      if (((_ref = word.match(this.validRegex)) != null ? _ref[0] : void 0) !== word) {
        throw "provided an invalid symbol " + word;
      }
      if (word.length === 1 && word[0] !== "/") {
        if (_ref1 = word[0], __indexOf.call(this.invalidFirstChars, _ref1) >= 0) {
          throw "Invalid first character in symbol " + word[0];
        }
      }
      if (((_ref2 = word[0]) === "-" || _ref2 === "+" || _ref2 === ".") && (word[1] != null) && word[1].match(/[0-9]/)) {
        throw "If first char is " + word[0] + " the second char can not be numeric. You had " + word[1];
      }
      if (word[0].match(/[0-9]/)) {
        throw "first character may not be numeric. You provided " + word[0];
      }
      return true;
    };

    function Symbol() {
      var args, parts;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      switch (args.length) {
        case 1:
          if (args[0] === "/") {
            this.ns = null;
            this.name = "/";
          } else {
            parts = args[0].split("/");
            if (parts.length === 1) {
              this.ns = null;
              this.name = parts[0];
              if (this.name === ":") {
                throw "can not have a symbol of only :";
              }
            } else if (parts.length === 2) {
              this.ns = parts[0];
              if (this.ns === "") {
                throw "can not have a slash at start of symbol";
              }
              if (this.ns === ":") {
                throw "can not have a namespace of :";
              }
              this.name = parts[1];
              if (this.name.length === 0) {
                throw "symbol may not end with a slash.";
              }
            } else {
              throw "Can not have more than 1 forward slash in a symbol";
            }
          }
          break;
        case 2:
          this.ns = args[0];
          this.name = args[1];
      }
      if (this.name.length === 0) {
        throw "Symbol can not be empty";
      }
      this.val = "" + (this.ns ? "" + this.ns + "/" : "") + this.name;
      this.valid(this.val);
    }

    Symbol.prototype.toString = function() {
      return this.val;
    };

    Symbol.prototype.ednEncode = function() {
      return this.val;
    };

    Symbol.prototype.jsEncode = function() {
      return this.val;
    };

    Symbol.prototype.jsonEncode = function() {
      return {
        Symbol: this.val
      };
    };

    return Symbol;

  })(Prim);

  Keyword = (function(_super) {

    __extends(Keyword, _super);

    Keyword.prototype.invalidFirstChars = ["#", "/"];

    function Keyword() {
      Keyword.__super__.constructor.apply(this, arguments);
      if (this.val[0] !== ":") {
        throw "keyword must start with a :";
      }
      if ((this.val[1] != null) === "/") {
        throw "keyword can not have a slash with out a namespace";
      }
    }

    Keyword.prototype.jsonEncode = function() {
      return {
        Keyword: this.val
      };
    };

    return Keyword;

  })(Symbol);

  char = memo(Char);

  kw = memo(Keyword);

  sym = memo(Symbol);

  bigInt = memo(BigInt);

  module.exports = {
    Prim: Prim,
    Symbol: Symbol,
    Keyword: Keyword,
    StringObj: StringObj,
    Char: Char,
    Discard: Discard,
    BigInt: BigInt,
    char: char,
    kw: kw,
    sym: sym,
    bigInt: bigInt
  };

}).call(this);
  })();
});

require.register("jsedn/lib/collections.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var Iterable, List, Map, Pair, Prim, Set, Vector, encode, equals, type,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  type = require("./type");

  equals = require("equals");

  Prim = require("./atoms").Prim;

  encode = require("./encode").encode;

  Iterable = (function(_super) {

    __extends(Iterable, _super);

    function Iterable() {
      return Iterable.__super__.constructor.apply(this, arguments);
    }

    Iterable.prototype.hashId = function() {
      return this.ednEncode();
    };

    Iterable.prototype.ednEncode = function() {
      return (this.map(function(i) {
        return encode(i);
      })).val.join(" ");
    };

    Iterable.prototype.jsonEncode = function() {
      return this.map(function(i) {
        if (i.jsonEncode != null) {
          return i.jsonEncode();
        } else {
          return i;
        }
      });
    };

    Iterable.prototype.jsEncode = function() {
      return (this.map(function(i) {
        if ((i != null ? i.jsEncode : void 0) != null) {
          return i.jsEncode();
        } else {
          return i;
        }
      })).val;
    };

    Iterable.prototype.exists = function(index) {
      return this.val[index] != null;
    };

    Iterable.prototype.each = function(iter) {
      var i, _i, _len, _ref, _results;
      _ref = this.val;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(iter(i));
      }
      return _results;
    };

    Iterable.prototype.map = function(iter) {
      return this.each(iter);
    };

    Iterable.prototype.walk = function(iter) {
      return this.map(function(i) {
        if ((i.walk != null) && type(i.walk) === "function") {
          return i.walk(iter);
        } else {
          return iter(i);
        }
      });
    };

    Iterable.prototype.at = function(index) {
      if (this.exists(index)) {
        return this.val[index];
      }
    };

    Iterable.prototype.set = function(index, val) {
      this.val[index] = val;
      return this;
    };

    return Iterable;

  })(Prim);

  List = (function(_super) {

    __extends(List, _super);

    function List() {
      return List.__super__.constructor.apply(this, arguments);
    }

    List.prototype.ednEncode = function() {
      return "(" + (List.__super__.ednEncode.call(this)) + ")";
    };

    List.prototype.jsonEncode = function() {
      return {
        List: List.__super__.jsonEncode.call(this)
      };
    };

    List.prototype.map = function(iter) {
      return new List(this.each(iter));
    };

    return List;

  })(Iterable);

  Vector = (function(_super) {

    __extends(Vector, _super);

    function Vector() {
      return Vector.__super__.constructor.apply(this, arguments);
    }

    Vector.prototype.ednEncode = function() {
      return "[" + (Vector.__super__.ednEncode.call(this)) + "]";
    };

    Vector.prototype.jsonEncode = function() {
      return {
        Vector: Vector.__super__.jsonEncode.call(this)
      };
    };

    Vector.prototype.map = function(iter) {
      return new Vector(this.each(iter));
    };

    return Vector;

  })(Iterable);

  Set = (function(_super) {

    __extends(Set, _super);

    Set.prototype.ednEncode = function() {
      return "\#{" + (Set.__super__.ednEncode.call(this)) + "}";
    };

    Set.prototype.jsonEncode = function() {
      return {
        Set: Set.__super__.jsonEncode.call(this)
      };
    };

    function Set(val) {
      var item, _i, _len;
      Set.__super__.constructor.call(this);
      this.val = [];
      for (_i = 0, _len = val.length; _i < _len; _i++) {
        item = val[_i];
        if (__indexOf.call(this.val, item) >= 0) {
          throw "set not distinct";
        } else {
          this.val.push(item);
        }
      }
    }

    Set.prototype.map = function(iter) {
      return new Set(this.each(iter));
    };

    return Set;

  })(Iterable);

  Pair = (function() {

    function Pair(key, val) {
      this.key = key;
      this.val = val;
    }

    return Pair;

  })();

  Map = (function() {

    Map.prototype.hashId = function() {
      return this.ednEncode();
    };

    Map.prototype.ednEncode = function() {
      var i;
      return "{" + (((function() {
        var _i, _len, _ref, _results;
        _ref = this.value();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(encode(i));
        }
        return _results;
      }).call(this)).join(" ")) + "}";
    };

    Map.prototype.jsonEncode = function() {
      var i;
      return {
        Map: (function() {
          var _i, _len, _ref, _results;
          _ref = this.value();
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            i = _ref[_i];
            _results.push(i.jsonEncode != null ? i.jsonEncode() : i);
          }
          return _results;
        }).call(this)
      };
    };

    Map.prototype.jsEncode = function() {
      var hashId, i, k, result, _i, _len, _ref, _ref1;
      result = {};
      _ref = this.keys;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        k = _ref[i];
        hashId = (k != null ? k.hashId : void 0) != null ? k.hashId() : k;
        result[hashId] = ((_ref1 = this.vals[i]) != null ? _ref1.jsEncode : void 0) != null ? this.vals[i].jsEncode() : this.vals[i];
      }
      return result;
    };

    function Map(val) {
      var i, v, _i, _len, _ref;
      this.val = val != null ? val : [];
      if (this.val.length && this.val.length % 2 !== 0) {
        throw "Map accepts an array with an even number of items. You provided " + this.val.length + " items";
      }
      this.keys = [];
      this.vals = [];
      _ref = this.val;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        v = _ref[i];
        if (i % 2 === 0) {
          this.keys.push(v);
        } else {
          this.vals.push(v);
        }
      }
      this.val = false;
    }

    Map.prototype.value = function() {
      var i, result, v, _i, _len, _ref;
      result = [];
      _ref = this.keys;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        v = _ref[i];
        result.push(v);
        if (this.vals[i] !== void 0) {
          result.push(this.vals[i]);
        }
      }
      return result;
    };

    Map.prototype.indexOf = function(key) {
      var i, k, _i, _len, _ref;
      _ref = this.keys;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        k = _ref[i];
        if (equals(k, key)) {
          return i;
        }
      }
      return void 0;
    };

    Map.prototype.exists = function(key) {
      return this.indexOf(key) != null;
    };

    Map.prototype.at = function(key) {
      var id;
      if ((id = this.indexOf(key)) != null) {
        return this.vals[id];
      } else {
        throw "key does not exist";
      }
    };

    Map.prototype.set = function(key, val) {
      var id;
      if ((id = this.indexOf(key)) != null) {
        this.vals[id] = val;
      } else {
        this.keys.push(key);
        this.vals.push(val);
      }
      return this;
    };

    Map.prototype.each = function(iter) {
      var k, _i, _len, _ref, _results;
      _ref = this.keys;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        _results.push(iter(this.at(k), k));
      }
      return _results;
    };

    Map.prototype.map = function(iter) {
      var result;
      result = new Map;
      this.each(function(v, k) {
        var nv, _ref;
        nv = iter(v, k);
        if (nv instanceof Pair) {
          _ref = [nv.key, nv.val], k = _ref[0], nv = _ref[1];
        }
        return result.set(k, nv);
      });
      return result;
    };

    Map.prototype.walk = function(iter) {
      return this.map(function(v, k) {
        if (type(v.walk) === "function") {
          return iter(v.walk(iter), k);
        } else {
          return iter(v, k);
        }
      });
    };

    return Map;

  })();

  module.exports = {
    Iterable: Iterable,
    List: List,
    Vector: Vector,
    Set: Set,
    Pair: Pair,
    Map: Map
  };

}).call(this);
  })();
});

require.register("jsedn/lib/compile.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {

  module.exports = function(string) {
    return "return require('jsedn').parse(\"" + (string.replace(/"/g, '\\"').replace(/\n/g, " ").trim()) + "\")";
  };

}).call(this);
  })();
});

require.register("jsedn/lib/encode.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var encode, encodeHandlers, encodeJson, tokenHandlers, type;

  type = require("./type");

  tokenHandlers = require("./tokens").tokenHandlers;

  encodeHandlers = {
    array: {
      test: function(obj) {
        return type(obj) === "array";
      },
      action: function(obj) {
        var v;
        return "[" + (((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = obj.length; _i < _len; _i++) {
            v = obj[_i];
            _results.push(encode(v));
          }
          return _results;
        })()).join(" ")) + "]";
      }
    },
    integer: {
      test: function(obj) {
        return type(obj) === "number" && tokenHandlers.integer.pattern.test(obj);
      },
      action: function(obj) {
        return parseInt(obj);
      }
    },
    float: {
      test: function(obj) {
        return type(obj) === "number" && tokenHandlers.float.pattern.test(obj);
      },
      action: function(obj) {
        return parseFloat(obj);
      }
    },
    string: {
      test: function(obj) {
        return type(obj) === "string";
      },
      action: function(obj) {
        return "\"" + (obj.toString().replace(/"|\\/g, '\\$&')) + "\"";
      }
    },
    boolean: {
      test: function(obj) {
        return type(obj) === "boolean";
      },
      action: function(obj) {
        if (obj) {
          return "true";
        } else {
          return "false";
        }
      }
    },
    "null": {
      test: function(obj) {
        return type(obj) === "null";
      },
      action: function(obj) {
        return "nil";
      }
    },
    date: {
      test: function(obj) {
        return type(obj) === "date";
      },
      action: function(obj) {
        return "#inst \"" + (obj.toISOString()) + "\"";
      }
    },
    object: {
      test: function(obj) {
        return type(obj) === "object";
      },
      action: function(obj) {
        var k, result, v;
        result = [];
        for (k in obj) {
          v = obj[k];
          result.push(encode(k));
          result.push(encode(v));
        }
        return "{" + (result.join(" ")) + "}";
      }
    }
  };

  encode = function(obj) {
    var handler, name;
    if ((obj != null ? obj.ednEncode : void 0) != null) {
      return obj.ednEncode();
    }
    for (name in encodeHandlers) {
      handler = encodeHandlers[name];
      if (handler.test(obj)) {
        return handler.action(obj);
      }
    }
    throw "unhandled encoding for " + (JSON.stringify(obj));
  };

  encodeJson = function(obj, prettyPrint) {
    if (obj.jsonEncode != null) {
      return encodeJson(obj.jsonEncode(), prettyPrint);
    }
    if (prettyPrint) {
      return JSON.stringify(obj, null, 4);
    } else {
      return JSON.stringify(obj);
    }
  };

  module.exports = {
    encodeHandlers: encodeHandlers,
    encode: encode,
    encodeJson: encodeJson
  };

}).call(this);
  })();
});

require.register("jsedn/lib/memo.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var memo;

  module.exports = memo = function(klass) {
    memo[klass] = {};
    return function(val) {
      if (memo[klass][val] == null) {
        memo[klass][val] = new klass(val);
      }
      return memo[klass][val];
    };
  };

}).call(this);
  })();
});

require.register("jsedn/lib/reader.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var BigInt, Char, Discard, Iterable, Keyword, List, Map, Pair, Prim, Set, StringObj, Symbol, Tag, Tagged, Vector, bigInt, char, encode, encodeHandlers, encodeJson, escapeChar, fs, handleToken, kw, lex, parenTypes, parens, parse, read, specialChars, sym, tagActions, tokenHandlers, type, typeClasses, _ref, _ref1, _ref2, _ref3, _ref4,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  type = require("./type");

  _ref = require("./atoms"), Prim = _ref.Prim, Symbol = _ref.Symbol, Keyword = _ref.Keyword, StringObj = _ref.StringObj, Char = _ref.Char, Discard = _ref.Discard, BigInt = _ref.BigInt, char = _ref.char, kw = _ref.kw, sym = _ref.sym, bigInt = _ref.bigInt;

  _ref1 = require("./collections"), Iterable = _ref1.Iterable, List = _ref1.List, Vector = _ref1.Vector, Set = _ref1.Set, Pair = _ref1.Pair, Map = _ref1.Map;

  _ref2 = require("./tags"), Tag = _ref2.Tag, Tagged = _ref2.Tagged, tagActions = _ref2.tagActions;

  _ref3 = require("./encode"), encodeHandlers = _ref3.encodeHandlers, encode = _ref3.encode, encodeJson = _ref3.encodeJson;

  _ref4 = require("./tokens"), handleToken = _ref4.handleToken, tokenHandlers = _ref4.tokenHandlers;

  typeClasses = {
    Map: Map,
    List: List,
    Vector: Vector,
    Set: Set,
    Discard: Discard,
    Tag: Tag,
    Tagged: Tagged,
    StringObj: StringObj
  };

  parens = '()[]{}';

  specialChars = parens + ' \t\n\r,';

  escapeChar = '\\';

  parenTypes = {
    '(': {
      closing: ')',
      "class": "List"
    },
    '[': {
      closing: ']',
      "class": "Vector"
    },
    '{': {
      closing: '}',
      "class": "Map"
    }
  };

  lex = function(string) {
    var c, escaping, in_comment, in_string, line, lines, list, token, _i, _len;
    list = [];
    lines = [];
    line = 1;
    token = '';
    for (_i = 0, _len = string.length; _i < _len; _i++) {
      c = string[_i];
      if (c === "\n" || c === "\r") {
        line++;
      }
      if ((typeof in_string === "undefined" || in_string === null) && c === ";" && (typeof escaping === "undefined" || escaping === null)) {
        in_comment = true;
      }
      if (in_comment) {
        if (c === "\n") {
          in_comment = void 0;
          if (token) {
            list.push(token);
            lines.push(line);
            token = '';
          }
        }
        continue;
      }
      if (c === '"' && (typeof escaping === "undefined" || escaping === null)) {
        if (typeof in_string !== "undefined" && in_string !== null) {
          list.push(new StringObj(in_string));
          lines.push(line);
          in_string = void 0;
        } else {
          in_string = '';
        }
        continue;
      }
      if (in_string != null) {
        if (c === escapeChar && (typeof escaping === "undefined" || escaping === null)) {
          escaping = true;
          continue;
        }
        if (escaping != null) {
          escaping = void 0;
          if (c === "t" || c === "n" || c === "f" || c === "r") {
            in_string += escapeChar;
          }
        }
        in_string += c;
      } else if (__indexOf.call(specialChars, c) >= 0 && (escaping == null)) {
        if (token) {
          list.push(token);
          lines.push(line);
          token = '';
        }
        if (__indexOf.call(parens, c) >= 0) {
          list.push(c);
          lines.push(line);
        }
      } else {
        if (escaping) {
          escaping = void 0;
        } else if (c === escapeChar) {
          escaping = true;
        }
        if (token === "#_") {
          list.push(token);
          lines.push(line);
          token = '';
        }
        token += c;
      }
    }
    if (token) {
      list.push(token);
      lines.push(line);
    }
    return {
      tokens: list,
      tokenLines: lines
    };
  };

  read = function(ast) {
    var read_ahead, result, token1, tokenLines, tokens;
    tokens = ast.tokens, tokenLines = ast.tokenLines;
    read_ahead = function(token, tokenIndex, expectSet) {
      var L, closeParen, handledToken, paren, tagged;
      if (tokenIndex == null) {
        tokenIndex = 0;
      }
      if (expectSet == null) {
        expectSet = false;
      }
      if (token === void 0) {
        return;
      }
      if ((!(token instanceof StringObj)) && (paren = parenTypes[token])) {
        closeParen = paren.closing;
        L = [];
        while (true) {
          token = tokens.shift();
          if (token === void 0) {
            throw "unexpected end of list at line " + tokenLines[tokenIndex];
          }
          tokenIndex++;
          if (token === paren.closing) {
            return new typeClasses[expectSet ? "Set" : paren["class"]](L);
          } else {
            L.push(read_ahead(token, tokenIndex));
          }
        }
      } else if (__indexOf.call(")]}", token) >= 0) {
        throw "unexpected " + token + " at line " + tokenLines[tokenIndex];
      } else {
        handledToken = handleToken(token);
        if (handledToken instanceof Tag) {
          token = tokens.shift();
          tokenIndex++;
          if (token === void 0) {
            throw "was expecting something to follow a tag at line " + tokenLines[tokenIndex];
          }
          tagged = new typeClasses.Tagged(handledToken, read_ahead(token, tokenIndex, handledToken.dn() === ""));
          if (handledToken.dn() === "") {
            if (tagged.obj() instanceof typeClasses.Set) {
              return tagged.obj();
            } else {
              throw "Exepected a set but did not get one at line " + tokenLines[tokenIndex];
            }
          }
          if (tagged.tag().dn() === "_") {
            return new typeClasses.Discard;
          }
          if (tagActions[tagged.tag().dn()] != null) {
            return tagActions[tagged.tag().dn()].action(tagged.obj());
          }
          return tagged;
        } else {
          return handledToken;
        }
      }
    };
    token1 = tokens.shift();
    if (token1 === void 0) {
      return void 0;
    } else {
      result = read_ahead(token1);
      if (result instanceof typeClasses.Discard) {
        return "";
      }
      return result;
    }
  };

  parse = function(string) {
    return read(lex(string));
  };

  module.exports = {
    Char: Char,
    char: char,
    Iterable: Iterable,
    Symbol: Symbol,
    sym: sym,
    Keyword: Keyword,
    kw: kw,
    BigInt: BigInt,
    bigInt: bigInt,
    List: List,
    Vector: Vector,
    Pair: Pair,
    Map: Map,
    Set: Set,
    Tag: Tag,
    Tagged: Tagged,
    setTypeClass: function(typeName, klass) {
      if (typeClasses[typeName] != null) {
        module.exports[typeName] = klass;
        return typeClasses[typeName] = klass;
      }
    },
    setTagAction: function(tag, action) {
      return tagActions[tag.dn()] = {
        tag: tag,
        action: action
      };
    },
    setTokenHandler: function(handler, pattern, action) {
      return tokenHandlers[handler] = {
        pattern: pattern,
        action: action
      };
    },
    setTokenPattern: function(handler, pattern) {
      return tokenHandlers[handler].pattern = pattern;
    },
    setTokenAction: function(handler, action) {
      return tokenHandlers[handler].action = action;
    },
    setEncodeHandler: function(handler, test, action) {
      return encodeHandlers[handler] = {
        test: test,
        action: action
      };
    },
    setEncodeTest: function(type, test) {
      return encodeHandlers[type].test = test;
    },
    setEncodeAction: function(type, action) {
      return encodeHandlers[type].action = action;
    },
    parse: parse,
    encode: encode,
    encodeJson: encodeJson,
    toJS: function(obj) {
      if ((obj != null ? obj.jsEncode : void 0) != null) {
        return obj.jsEncode();
      } else {
        return obj;
      }
    },
    atPath: require("./atPath"),
    unify: require("./unify")(parse),
    compile: require("./compile")
  };

  if (typeof window === "undefined") {
    fs = require("fs");
    module.exports.readFile = function(file, cb) {
      return fs.readFile(file, "utf-8", function(err, data) {
        if (err) {
          throw err;
        }
        return cb(parse(data));
      });
    };
    module.exports.readFileSync = function(file) {
      return parse(fs.readFileSync(file, "utf-8"));
    };
  }

}).call(this);
  })();
});

require.register("jsedn/lib/tags.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var Prim, Tag, Tagged, tagActions, type,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Prim = require("./atoms").Prim;

  type = require("./type");

  Tag = (function() {

    function Tag() {
      var name, namespace, _ref;
      namespace = arguments[0], name = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      this.namespace = namespace;
      this.name = name;
      if (arguments.length === 1) {
        _ref = arguments[0].split('/'), this.namespace = _ref[0], this.name = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
      }
    }

    Tag.prototype.ns = function() {
      return this.namespace;
    };

    Tag.prototype.dn = function() {
      return [this.namespace].concat(this.name).join('/');
    };

    return Tag;

  })();

  Tagged = (function(_super) {

    __extends(Tagged, _super);

    function Tagged(_tag, _obj) {
      this._tag = _tag;
      this._obj = _obj;
    }

    Tagged.prototype.jsEncode = function() {
      return {
        tag: this.tag().dn(),
        value: this.obj().jsEncode()
      };
    };

    Tagged.prototype.ednEncode = function() {
      return "\#" + (this.tag().dn()) + " " + (require("./encode").encode(this.obj()));
    };

    Tagged.prototype.jsonEncode = function() {
      return {
        Tagged: [this.tag().dn(), this.obj().jsonEncode != null ? this.obj().jsonEncode() : this.obj()]
      };
    };

    Tagged.prototype.tag = function() {
      return this._tag;
    };

    Tagged.prototype.obj = function() {
      return this._obj;
    };

    Tagged.prototype.walk = function(iter) {
      return new Tagged(this._tag, type(this._obj.walk) === "function" ? this._obj.walk(iter) : iter(this._obj));
    };

    return Tagged;

  })(Prim);

  tagActions = {
    uuid: {
      tag: new Tag("uuid"),
      action: function(obj) {
        return obj;
      }
    },
    inst: {
      tag: new Tag("inst"),
      action: function(obj) {
        return new Date(Date.parse(obj));
      }
    }
  };

  module.exports = {
    Tag: Tag,
    Tagged: Tagged,
    tagActions: tagActions
  };

}).call(this);
  })();
});

require.register("jsedn/lib/tokens.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var Char, StringObj, Tag, bigInt, char, handleToken, kw, sym, tokenHandlers, _ref;

  _ref = require("./atoms"), Char = _ref.Char, StringObj = _ref.StringObj, char = _ref.char, kw = _ref.kw, sym = _ref.sym, bigInt = _ref.bigInt;

  Tag = require("./tags").Tag;

  handleToken = function(token) {
    var handler, name;
    if (token instanceof StringObj) {
      return token.toString();
    }
    for (name in tokenHandlers) {
      handler = tokenHandlers[name];
      if (handler.pattern.test(token)) {
        return handler.action(token);
      }
    }
    return sym(token);
  };

  tokenHandlers = {
    nil: {
      pattern: /^nil$/,
      action: function(token) {
        return null;
      }
    },
    boolean: {
      pattern: /^true$|^false$/,
      action: function(token) {
        return token === "true";
      }
    },
    keyword: {
      pattern: /^[\:].*$/,
      action: function(token) {
        return kw(token);
      }
    },
    char: {
      pattern: /^\\.*$/,
      action: function(token) {
        return char(token.slice(1));
      }
    },
    integer: {
      pattern: /^[\-\+]?[0-9]+N?$/,
      action: function(token) {
        if (/\d{15,}/.test(token)) {
          return bigInt(token);
        }
        return parseInt(token === "-0" ? "0" : token);
      }
    },
    float: {
      pattern: /^[\-\+]?[0-9]+(\.[0-9]*)?([eE][-+]?[0-9]+)?M?$/,
      action: function(token) {
        return parseFloat(token);
      }
    },
    tagged: {
      pattern: /^#.*$/,
      action: function(token) {
        return new Tag(token.slice(1));
      }
    }
  };

  module.exports = {
    handleToken: handleToken,
    tokenHandlers: tokenHandlers
  };

}).call(this);
  })();
});

require.register("jsedn/lib/type.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  module.exports = typeof module !== "undefined" && this.module !== module ? require("type-component") : require("type");
}).call(this);
  })();
});

require.register("jsedn/lib/unify.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "jsedn");
  (function() {
    // Generated by CoffeeScript 1.6.1
(function() {
  var Map, Pair, Symbol, kw, sym, type, _ref, _ref1;

  type = require("./type");

  _ref = require("./collections"), Map = _ref.Map, Pair = _ref.Pair;

  _ref1 = require("./atoms"), Symbol = _ref1.Symbol, kw = _ref1.kw, sym = _ref1.sym;

  module.exports = function(parse) {
    return function(data, values, tokenStart) {
      var unifyToken, valExists;
      if (tokenStart == null) {
        tokenStart = "?";
      }
      if (type(data) === "string") {
        data = parse(data);
      }
      if (type(values) === "string") {
        values = parse(values);
      }
      valExists = function(v) {
        if (values instanceof Map) {
          if (values.exists(v)) {
            return values.at(v);
          } else if (values.exists(sym(v))) {
            return values.at(sym(v));
          } else if (values.exists(kw(":" + v))) {
            return values.at(kw(":" + v));
          }
        } else {
          return values[v];
        }
      };
      unifyToken = function(t) {
        var val;
        if (t instanceof Symbol && ("" + t)[0] === tokenStart && ((val = valExists(("" + t).slice(1))) != null)) {
          return val;
        } else {
          return t;
        }
      };
      return data.walk(function(v, k) {
        if (k != null) {
          return new Pair(unifyToken(k), unifyToken(v));
        } else {
          return unifyToken(v);
        }
      });
    };
  };

}).call(this);
  })();
});

require.register("type-component/index.js", function(exports, require, module) {
  require = __makeRelativeRequire(require, {}, "type-component");
  (function() {
    /**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val === Object(val)) return 'object';

  return typeof val;
};
  })();
});
require.alias("axios/lib/adapters/xhr.js", "axios/lib/adapters/http");
require.alias("axios/lib/adapters/xhr.js", "axios/lib/adapters/http.js");require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

'use strict';

/* jshint ignore:start */
(function () {
  var WebSocket = window.WebSocket || window.MozWebSocket;
  var br = window.brunch = window.brunch || {};
  var ar = br['auto-reload'] = br['auto-reload'] || {};
  if (!WebSocket || ar.disabled) return;
  if (window._ar) return;
  window._ar = true;

  var cacheBuster = function cacheBuster(url) {
    var date = Math.round(Date.now() / 1000).toString();
    url = url.replace(/(\&|\\?)cacheBuster=\d*/, '');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'cacheBuster=' + date;
  };

  var browser = navigator.userAgent.toLowerCase();
  var forceRepaint = ar.forceRepaint || browser.indexOf('chrome') > -1;

  var reloaders = {
    page: function page() {
      window.location.reload(true);
    },

    stylesheet: function stylesheet() {
      [].slice.call(document.querySelectorAll('link[rel=stylesheet]')).filter(function (link) {
        var val = link.getAttribute('data-autoreload');
        return link.href && val != 'false';
      }).forEach(function (link) {
        link.href = cacheBuster(link.href);
      });

      // Hack to force page repaint after 25ms.
      if (forceRepaint) setTimeout(function () {
        document.body.offsetHeight;
      }, 25);
    },

    javascript: function javascript() {
      var scripts = [].slice.call(document.querySelectorAll('script'));
      var textScripts = scripts.map(function (script) {
        return script.text;
      }).filter(function (text) {
        return text.length > 0;
      });
      var srcScripts = scripts.filter(function (script) {
        return script.src;
      });

      var loaded = 0;
      var all = srcScripts.length;
      var onLoad = function onLoad() {
        loaded = loaded + 1;
        if (loaded === all) {
          textScripts.forEach(function (script) {
            eval(script);
          });
        }
      };

      srcScripts.forEach(function (script) {
        var src = script.src;
        script.remove();
        var newScript = document.createElement('script');
        newScript.src = cacheBuster(src);
        newScript.async = true;
        newScript.onload = onLoad;
        document.head.appendChild(newScript);
      });
    }
  };
  var port = ar.port || 9485;
  var host = br.server || window.location.hostname || 'localhost';

  var connect = function connect() {
    var connection = new WebSocket('ws://' + host + ':' + port);
    connection.onmessage = function (event) {
      if (ar.disabled) return;
      var message = event.data;
      var reloader = reloaders[message] || reloaders.page;
      reloader();
    };
    connection.onerror = function () {
      if (connection.readyState) connection.close();
    };
    connection.onclose = function () {
      window.setTimeout(connect, 1000);
    };
  };
  connect();
})();
/* jshint ignore:end */
;
//# sourceMappingURL=vendor.js.map