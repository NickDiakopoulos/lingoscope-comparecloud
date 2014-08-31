var CorpusModel = Backbone.Model.extend({
	defaults: {
		corpusID: -1,
		corpusName: "",
	}
});

var CorpusCollection = Backbone.Collection.extend({
	model: CorpusModel,
	initialize: function () {
		this.reset();
		this.push({corpusID: 1, corpusName: "MSM"});
		this.push({corpusID: 2, corpusName: "Blogs"});
		
		this.sort();
	},
	comparator: "corpusID",
});

PrevalenceModel = Backbone.Model.extend({
	defaults: {
		 totalSentences: 0,
		 totalPosts: 0,
		 anchorTerm: "",
		 anchorTermPostHits: 0, // Hits for the search term
		 anchorTermSentenceHits: 0,
		 corpusID: 0,
		 terms: null,
	},
	setURL: function (corpusID, anchorTerm) {
		//console.log("seturl")
		this.set("corpusID", corpusID);
		anchorTerm = typeof anchorTerm !== undefined ? anchorTerm : "";
		this.set("anchorTerm", anchorTerm)
		if (this.get("anchorTerm") == "")
			this.urlRoot = config.URL_ROOT + "surveillance/corpusPrevalence_" + this.get("corpusID") + ".json"
		else
			this.urlRoot = config.URL_ROOT + "surveillance/corpusPrevalence_" + this.get("corpusID") + "_" + this.get("anchorTerm") + ".json"
	},
	parse: function (data, options) {	
		data.terms = new TermCollection(data.terms)					
		return data;
	},
})


var TermModel = Backbone.Model.extend({
	defaults: {
		term: "",
		postHits: 0,
		sentenceHits: 0,
		filteredOut: 0
	},
});

var TermCollection = Backbone.Collection.extend({
	model: TermModel,
	url: "",
})


var CCTermModel = Backbone.Model.extend({
	defaults: {
		term: "",
		postRate_c1: 0,
		postRate_c2: 0,
		postHits_c1: 0,
		postHits_c2: 0,
		sentenceRate_c1: 0,
		sentenceRate_c2: 0,
		combinedPostRate: 0,     // # c1 + # c2 / total c1 + total c2
		combinedSentenceRate: 0,		
		filtered: 0
	},
});

var CCTermCollection = Backbone.Collection.extend({
	model: CCTermModel,
	url: "",
	//comparator: "term"
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
	setURL: function (filename) {
		this.url = config.WF_URL_ROOT + "data/"+filename;
	}
});

var SentenceModel = Backbone.Model.extend({
	defaults: {
		text: "",
		postID: -1,
		link: "", 
		link_display: "",
		published_at: "", 
	},
	parse: function (data, options) {
		//console.log(window.post_dictionary)
		var o = window.post_dictionary[data.postID];
		//console.log(o)
		data.link = o.link;
		data.link_display = o.link.substring(0, 50) + "...";
		//console.log(o.published_at)
		data.published_at = new Date(Date.parse(o.published_at));
		//console.log(data.published_at.toUTCString())
		//console.log(data.published_at.getMonth())
		return data;
	}
});

var SentenceCollection = Backbone.Collection.extend({
	model: SentenceModel,
	initialize: function () {		
		
	},
	setURL: function (corpusID, anchorTerm, contextTerm) {
		this.url = config.URL_ROOT + "surveillance/sentences_anchor_context/sentences_"+corpusID+"_"+anchorTerm+"_"+contextTerm+".json";
		//console.log(this.url)
	}
});


// var PostModel = Backbone.Model.extend({
// 	defaults: {
// 		postID: -1,
// 		link: "",
// 		published_at: "",		
// 	}
// });

// var PostCollection = Backbone.Collection.extend({
// 	model: PostModel,
// 	initialize: function () {		
// 		this.url = config.URL_ROOT + "surveillance/postDictionary.json";
// 	},
// 	parse: function (data, options) {	
// 		console.log("parse")
// 		data.published_at = new Date(Date.parse(data.published_at));
// 		return data;
// 	},
// });