var OutletModel = Backbone.Model.extend({
	defaults: {
		outletID: "",
		outletName: "",
		outletType: "",
	}
});

var OutletCollection = Backbone.Collection.extend({
	model: OutletModel,
	initializeNews: function () {
		this.reset();
		this.push({outletType: "news", outletID: "2c20eeebd3486973559db5b654d87771", outletName: "CNN"});
		this.push({outletType: "news", outletID: "1d6a203ee1cf446922f9a96ffab56ae3", outletName: "Reuters"});
		this.push({outletType: "news", outletID: "48c2fafeeef91e4bc613b0f942a03e5a", outletName: "Associated Press (AP)"});
		this.push({outletType: "news", outletID: "b2c3b6f3882359503bad564babe5fdf9", outletName: "USA Today"});

		this.push({outletType: "news", outletID: "f668ac1f65393e74632007ba18c56bf0", outletName: "LA Times"});
		this.push({outletType: "news", outletID: "723464bbe82aac930336e02ccb555427", outletName: "Washington Post"});
		this.push({outletType: "news", outletID: "fcbfc403c4131b3361bf2ebeee2a743d", outletName: "Chicago Tribune"});
		this.push({outletType: "news", outletID: "78bbd5564397ad6f92c734efd91a2296", outletName: "NewsDay"});

		this.push({outletType: "news", outletID: "c6c324e99626614f207084fb6285a19b", outletName: "Houston Chronicle"});
		this.push({outletType: "news", outletID: "23df2f82e304a7bd2f2b0a8f68a983a4", outletName: "Philly Inquirer"});
		this.push({outletType: "news", outletID: "f859b2e958a3cf44871e55762a79f53e", outletName: "Minneapolis Star Tribune"});
		this.push({outletType: "news", outletID: "c43739e1ff89441a60b06796a681000c", outletName: "Honolulu Star-Advertiser"});

		this.push({outletType: "news", outletID: "f1438f18dbb8b09386ed6b02a29a743f", outletName: "Huffington Post"});
		this.push({outletType: "news", outletID: "1ce0362f2e764a95b0c7351c05a4eb19", outletName: "New York Times"});

		this.sort();
	},
	initializeBlogs: function () {		
		this.reset();
		this.push({outletType: "blogs", outletID: "skeptics", sceptics_class:"s", outletName: "Climate Change Skeptics"});
		this.push({outletType: "blogs", outletID: "acceptors", sceptics_class:"a", outletName: "Climate Change Acceptors"});
		
		this.sort();
	},
	comparator: function(item) { return [item.get("outletType"), item.get("outletName")] }
});


var QueryModel = Backbone.Model.extend({
	defaults: {
		hits_found: 0,
		terms_found: 0,
		articles_found: 0,
		term_set: null,
	},
	constructor: function() {
		arguments.parse = true;		
		Backbone.Model.apply(this, arguments);
	}, 
	parse: function(data, options) {
		// TODO - don't like how i have to pass down the normalizing factor here - seems wrong

		console.time("parsing")
		var freq_filter = parseInt($("#context_word_freq_filter").val());
		console.log(freq_filter)
		data.term_set = _.filter(data.term_set, function(m1) {	
			//console.log(parseInt(m1.context_hits))	
			// exclude tokens that are spurious	 
			if (parseInt(m1.context_hits) < freq_filter )
				return false;
			else
				return true;
		}, this);

		data.term_set = new ContextTermCollection(data.term_set, {parse: true, hf: data.hits_found});
		console.timeEnd("parsing")
		//data.term_set.querymodel = this;
		return data;
	},
	setURL: function(params, source_num) {
		// Based on params sent in, set up the URL to execute the query.  
		if(params.search_string != "")
		{
			if (source_num == 1)
			{
				if(params.outlet1.get("outletType") == "news")
				{
					this.urlRoot = config.AMAZON_SERVER + "/coocurrence?access_key="+config.API_KEY+"&sources="+params.outlet1.get("outletID")+"&query="+params.search_string+"&scope="+params.context+"&fulltext=true&format=json";
				}
				else if (params.outlet1.get("outletType") == "blogs")
				{
					this.urlRoot = config.AMAZON_SERVER + "/climate?access_key="+config.API_KEY+"&sceptics_class="+params.outlet1.get("sceptics_class")+"&query="+params.search_string+"&scope="+params.context+"&format=json";
				}
			}
			else if (source_num == 2)
			{
				if(params.outlet2.get("outletType") == "news")
				{
					this.urlRoot = config.AMAZON_SERVER + "/coocurrence?access_key="+config.API_KEY+"&sources="+params.outlet2.get("outletID")+"&query="+params.search_string+"&scope="+params.context+"&fulltext=true&format=json";
				}
				else if (params.outlet2.get("outletType") == "blogs")
				{
					this.urlRoot = config.AMAZON_SERVER + "/climate?access_key="+config.API_KEY+"&sceptics_class="+params.outlet2.get("sceptics_class")+"&query="+params.search_string+"&scope="+params.context+"&format=json";
				}
			}
			
		}
		console.log(this.urlRoot)
		
	}
});

var ContextTerm = Backbone.Model.extend({
	defaults: {
		term: "",
		pos: "",
		context_hits: 0,
		article_hits: 0,
		polarity: "",
		subjectivity: "",
		timeline: null,		
		context_hit_rate: 0,
		total_hits_all_terms: 0,
	},
	parse: function(data, options) {		
		//console.log(options.qm.get("hits_found"))
		//data.timeline = new TimelineCollection(_.values(data.timeline), {parse: true, hf: options.hf});
		data.timeline = new TimelineCollection(_.values(_.filter(data.timeline, function(k, v) { if (k.time_period != "January-1970") return true;})), {parse: true, hf: options.hf});
		data.timeline.sort();
		data.context_hit_rate = data.context_hits / options.hf;
		data.total_hits_all_terms = options.hf;
		data.context_hits = parseInt(data.context_hits);
		
		return data;
	},
});

var ContextTermCollection = Backbone.Collection.extend({
	model: ContextTerm,
	url: "",
	initialize: function () {		
		
	},
	comparator: function (m1, m2) {
		if (m1.get("context_hit_rate") < m2.get("context_hit_rate"))
			return 1
		else return -1
		//console.log(options)
		//return m.get("context_hits") / m.get("article_hits");
	}
})

var TimelineModel = Backbone.Model.extend({
	defaults: {
		time_period: null,
		context_hits: 0,
		context_hit_rate: 0,
		article_hits: 0,
		total_context_hits: 0, // total # of times search word was found for this month
		total_article_hits: 0, // total # of articles where search word was found for this month
	},	
	parse: function(data, options) {		
		
		data.time_period = new Date(data.time_period);

		data.context_hits = parseInt(data.context_hits);
		data.article_hits = parseInt(data.article_hits);
		data.total_context_hits = parseInt(data.total_context_hits);
		//data.context_hit_rate = data.context_hits / options.hf;
		if (data.total_context_hits != 0)
			data.context_hit_rate = data.context_hits / data.total_context_hits; // the % rate of hits where this is the context word, out of all possible hits where this could be the context word
		else
			data.context_hit_rate = 0;
		return data;
	},
});

var TimelineCollection = Backbone.Collection.extend({
	model: TimelineModel,
	url: "",
	initialize: function () {		
		// if there's a model with date in 1970 then don'e include it
		//console.log(v)
	},
	comparator: function (m1, m2) {
		if (m1.get("time_period").getTime() < m2.get("time_period").getTime())
			return -1;
		else return 1;
	},
})

var DetailsModel = Backbone.Model.extend({
	defaults: {
		snippet_set: null,
		published_at: null,
		source: null,
		source_guid: "",
		title: "",
		link: "",
	},
	parse: function(data, options) {
		//console.log(data.published_at)			
		data.published_at = new Date(data.published_at);
		data.source_guid = data.source.guid;	
		
		return data;
	},
})

var DetailsCollection = Backbone.Collection.extend({
	model: DetailsModel,	
	initialize: function () {		
		
	},
	parse: function (data, options) {
		//console.log(data)
		data = data.article_set;
		//console.log(data)
		return data;
	},
	setURL: function(params) {
		// Based on params sent in, set up the URL to execute the query. 
		
		this.url = config.AMAZON_SERVER + "snippets?access_key="+config.API_KEY+"&sources="+params.source_id+"&query="+params.search_string+"&context_term="+params.context_term+"&context="+params.context+"&fulltext=true&fields=article.snippet%20article.link%20article.source.guid%20article.title%20article.author%20article.published_at&format=json&pagesize="+params.pagesize+"&offset="+params.offset;
		
		// If we have time bounds for the query then add them in
		if(params.from_date != undefined)
		{			
			params.from_date = moment(params.from_date).format('YYYY-MM-DD');			//hh:mm:ss
			this.url += "&from_date="+encodeURIComponent(params.from_date);
		}
		if(params.to_date != undefined)
		{
			params.to_date = moment(params.to_date).format('YYYY-MM-DD');		
			this.url += "&to_date="+encodeURIComponent(params.to_date);
		}

		console.log(this.url)
	},
	comparator: function (m1, m2) {
		if (m1.get("published_at").getTime() < m2.get("published_at").getTime())
			return 1;
		else return -1;
	},
})



var BlogDetailsModel = Backbone.Model.extend({
	defaults: {
		snippet_set: null,
		group_id: null,
		url: null,
		guid: "",
		sceptics_class: "",
		date: null,
	},
	parse: function(data, options) {		
		data.date = new Date(data.date);
		
		return data;
	},
})

var BlogDetailsCollection = Backbone.Collection.extend({
	model: BlogDetailsModel,	
	initialize: function () {		
		
	},
	parse: function (data, options) {
		this.num_found = parseInt(data.num_found);
		data = data.article_set;
		//console.log(data)
		return data;
	},
	setURL: function(params) {
		// Based on params sent in, set up the URL to execute the query. 						
		if (params.outlet.get("outletType") == "blogs")
		{			
			this.url = config.AMAZON_SERVER + "climate_snippets?access_key="+config.API_KEY+"&sceptics_class="+params.outlet.get("sceptics_class")+"&query="+params.search_string+"&context_term="+params.context_term+"&context="+params.context+"&format=json&cache=false"+"&pagesize="+params.pagesize+"&offset="+params.offset;			
		}
		// If we have time bounds for the query then add them in
		if(params.from_date != undefined)
		{			
			params.from_date = moment(params.from_date).format('YYYY-MM-DD');			//hh:mm:ss
			this.url += "&from_date="+encodeURIComponent(params.from_date);
		}
		if(params.to_date != undefined)
		{
			params.to_date = moment(params.to_date).format('YYYY-MM-DD');		
			this.url += "&to_date="+encodeURIComponent(params.to_date);
		}

		console.log(this.url)
	},
	comparator: function (m1, m2) {
		if (m1.get("date").getTime() < m2.get("date").getTime())
			return 1;
		else return -1;
	},
})


var WordModel = Backbone.Model.extend({
	defaults: {
		word: "",
	}
});

var WordCollection = Backbone.Collection.extend({
	model: WordModel,
	initialize: function () {		
		
	},
});