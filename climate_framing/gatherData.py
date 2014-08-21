import requests # http://docs.python-requests.org/ library useful for scraping
import json
from time import sleep
import csv
import os
import subprocess



def getContextTerms(term, sceptics_class, context):
	print term
	url_root = "http://lingoscope.newscred.com/climate?"		
	params = {"access_key": "8996a2c183f27731f296d23ff85f02c2", "sceptics_class": sceptics_class, "scope": context, "query": term, "format": "json"}
	# Make the request
	r = requests.get(url_root, params=params, timeout=600)
	print r.url
	#print r.text
	r_json = json.loads(r.text)
	# remove the timeline
	for context_term in r_json["term_set"]:
		del context_term["timeline"]
	#print r_json

	with open('data/'+term+'_'+sceptics_class+'_'+context+'.json', 'w') as outfile:
  		json.dump(r_json, outfile)


def getContextTermsBlog(term, context, blog_url):
	#print term
	url_root = "http://lingoscope.newscred.com/climate?"		
	params = {"access_key": "8996a2c183f27731f296d23ff85f02c2", "scope": context, "query": term, "format": "json", "blog_url": blog_url}
	# Make the request
	r = requests.get(url_root, params=params, timeout=300)
	#print r.url
	#print r.text
	r_json = json.loads(r.text)
	# remove the timeline
	for context_term in r_json["term_set"]:
		del context_term["timeline"]
	#print r_json

	with open('data_blogurls/'+term+'_'+context+'_'+blog_url+'.json', 'w') as outfile:
  		json.dump(r_json, outfile)

  	return r_json


# load list of climate terms
climateTerms = []
csvFile = open("climate_terms_reduced2.csv", 'Ur')
csvReader = csv.reader(csvFile, delimiter=',', quotechar='"')
for row in csvReader:
	climateTerms.append(row[0])

#climateTerms = ["biofuel"]

urls = []
csvFile = open("../data/blog_urls_recount.csv", 'Ur')
csvReader = csv.reader(csvFile, delimiter=',', quotechar='"')
for row in csvReader:
	urls.append(row[0])

def gatherScepticsAcceptors():
	# for each climate term, for each blog type, get sentence context
	for climate_term in climateTerms:
		for blog_class in ["s", "a"]:			
			getContextTerms(climate_term, blog_class, "sentence")

gatherScepticsAcceptors()

# Will gather data by searching each blog for its hits and generate a matrix
def gatherBlogs():
	fileWriter = csv.writer(open("data_blogurls/blog_term_matrix.csv", "w+"),delimiter=",")
	row = [0]
	row.extend(climateTerms)
	fileWriter.writerow(row)

	for url in urls:
		print url
		row = [url]
		for climate_term in climateTerms:			
			r_json = getContextTermsBlog(climate_term, "sentence", url)			
			row.append(r_json["hits_found"])
			if r_json["hits_found"] > 100:
				print "  " + climate_term + str(r_json["hits_found"])
		fileWriter.writerow(row)

#gatherBlogs()

def gatherBlogsCurl():
	fileWriter = csv.writer(open("data_blogurls/blog_term_matrix_recount23.csv", "w+"),delimiter=",")
	row = [0]
	row.extend(climateTerms)
	fileWriter.writerow(row)
	for url in urls:
		print url
		row = [url]
		for climate_term in climateTerms:	
			cmd = "curl -XGET 'ec2-54-211-248-226.compute-1.amazonaws.com:9200/lingoscope3/climate/_search' -d '{'filter': {'and': [{'term': {'url': \""+url+"\"}}]}, 'query': {'query_string': {'fields': [\"text\"], 'query': \"\\\""+climate_term+"\\\"\"}}, 'from': 0, 'size': 0}'"

			#print cmd
			
			output = subprocess.check_output(cmd, shell=True)
			j_output = json.loads(str(output))							
			row.append(j_output["hits"]["total"])
			
		print row
		fileWriter.writerow(row)

#gatherBlogsCurl()



