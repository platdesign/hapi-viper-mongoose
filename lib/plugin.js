'use strict';

// Deps
var mongoose = require('mongoose');


/**
 * Plugin module: hapi-viper-mongoose
 *
 * @param  {Object}   server  Plugin server object
 * @param  {Object}   options Plugin options
 * @param  {Function} next    Needs to be called on terminating plugin configuration
 * @return {VOID}
 */
module.exports = function register(plugin, options, next) {

	var viper = plugin.plugins.viper;

	var promise = Promise.resolve();


	Object.keys(options).forEach(function(key) {
		promise = promise.then(function() {
			return createCon(key, options[key], plugin);
		})
		.then(function(con) {
			viper.value(key, con);
		});
	});


	// finish plugin configuration
	promise.then(function() {
		next();
	}, next);

};


// Set plugin attributes
module.exports.attributes = {
	name: 'hapi-viper-mongoose'
};







function createCon(name, options, plugin) {

	return new Promise(function(resolve, reject) {

		var con = mongoose.createConnection('mongodb://'+options.host+':'+options.port+'/'+options.db, {
			user: options.username,
			pass: options.password
		});

		con.on('error', reject);

		con.once('open', function() {

			var models = {
				_db: con
			};

			registerModelsFromPath(options.modelsPath, con, plugin);

			con.modelNames()
			.forEach(function(modelName) {
				models[modelName] = con.model(modelName);
			});

			associateModels(models);

			resolve(models);

		});


	});

}
