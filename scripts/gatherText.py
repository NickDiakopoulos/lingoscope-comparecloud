import requests # http://docs.python-requests.org/ library useful for scraping
import json
from time import sleep
import csv
import sys 

outlets = [{"outletID": "2c20eeebd3486973559db5b654d87771", "outletName": "CNN", "abbreviation": "CNN"}, 
		   {"outletID": "1d6a203ee1cf446922f9a96ffab56ae3", "outletName": "Reuters", "abbreviation": "REU"},
		   {"outletID": "b2c3b6f3882359503bad564babe5fdf9", "outletName": "USA Today", "abbreviation": "USAT"},
		   {"outletID": "f668ac1f65393e74632007ba18c56bf0", "outletName": "LA Times", "abbreviation": "LAT"},
		   {"outletID": "723464bbe82aac930336e02ccb555427", "outletName": "Washington Post", "abbreviation": "WP"}, 
		   {"outletID": "fcbfc403c4131b3361bf2ebeee2a743d", "outletName": "Chicago Tribune", "abbreviation": "CT"}, 
		   {"outletID": "78bbd5564397ad6f92c734efd91a2296", "outletName": "NewsDay", "abbreviation": "ND"}, 
		   {"outletID": "c6c324e99626614f207084fb6285a19b", "outletName": "Houston Chronicle", "abbreviation": "HC"}, 
		   {"outletID": "23df2f82e304a7bd2f2b0a8f68a983a4", "outletName": "Philly Inquirer", "abbreviation": "PI"}, 
		   {"outletID": "f859b2e958a3cf44871e55762a79f53e", "outletName": "Minneapolis Star Tribune", "abbreviation": "MST"}, 
		   {"outletID": "c43739e1ff89441a60b06796a681000c", "outletName": "Honolulu Star-Advertiser", "abbreviation": "HSA"},
		   {"outletID": "f1438f18dbb8b09386ed6b02a29a743f", "outletName": "Huffington Post", "abbreviation": "HP"}, 
		   {"outletID": "1ce0362f2e764a95b0c7351c05a4eb19", "outletName": "New York Times", "abbreviation": "NYT"},
		   {"outletID": "48c2fafeeef91e4bc613b0f942a03e5a", "outletName": "Associated Press (AP)", "abbreviation": "AP"}]


def getTexts(term, context_term, source_abbrev):
	fileWriter = open('../data/'+term+'_'+context_term+'_'+source_abbrev+'_snippets.txt', 'w+')

	source_id = [o["outletID"] for o in outlets if o["abbreviation"] == source_abbrev][0]
	
	url_root = "http://lingoscope.newscred.com/snippets?"	

	offset = 0
	pagesize = 50
	while True:
		params = {"access_key": "8996a2c183f27731f296d23ff85f02c2", "context": "sentence", "query": term, "context_term": context_term, "sources": source_id, "fields": "article.snippet" ,"format": "json", "pagesize": pagesize, "offset": offset}

		r = requests.get(url_root, params=params, timeout=600)
		print r.url

		article_set = json.loads(r.text)["article_set"]
		
		if len(article_set) == 0:
			break

		for a in article_set:
			snippet_set = a["snippet_set"]
			for s in snippet_set:
				s = s.replace("...", "")
				s = s.replace('"', '')
				#print s
				fileWriter.write(s.encode("utf8")+"\n")

		offset = offset + pagesize



# compare HP vs. HC
#getTexts("immigration", "enforcement", "HC")

if len(sys.argv) == 4:
	term = str(sys.argv[1])
	context_term = str(sys.argv[2])
	source_abbrev = str(sys.argv[3])
	getTexts(term, context_term, source_abbrev)

else:
	print "Usage: python gatherTexts.py <term> <context term> <source abbreviation>"
	sys.exit()