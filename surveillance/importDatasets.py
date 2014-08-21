import json
from time import sleep
import csv
import sys 
import MySQLdb
import MySQLdb.cursors
import os
import re
import codecs
from datetime import date
from datetime import datetime
import hashlib
import urllib
import requests # http://docs.python-requests.org/ library useful for scraping

# DONE: fisa, wiretapping, prism, retention, nsa, snowden, surveillance, collection, intelligence, security
#guardian_key = "tzzg3y3p3j6udqpgvzcyh7zx" # limit of 12 / sec and 5k per day

dc = MySQLdb.connect(db="lingoscope", user="lingoscoper", passwd="showmethedata", cursorclass=MySQLdb.cursors.DictCursor)
dc.autocommit(True)
dc.set_character_set('utf8')
dbc = dc.cursor()
dbc.execute('SET NAMES utf8;')
dbc.execute('SET CHARACTER SET utf8;')
dbc.execute('SET character_set_connection=utf8;')
dbc.execute('SET session time_zone = "America/New_York";')


nc_data_dir = "/home/nad/projects/lingoscope_data/surveillance_data_nc/security-AP/"
blogs_data_dir = "/home/nad/projects/lingoscope_data/surveillance_data_blogs/" 
guardian_data_dir = "/home/nad/projects/lingoscope_data/surveillance_data_guardian/" 

reg_exp = re.compile("data retention|edward snowden|electronic surveillance|fisa court|government surveillance|intelligence agencies|intelligence surveillance|internet surveillance|mass data collection program|mass surveillance|nsa program|nsa spying|nsa surveillance|prism program|retention directive|retention policy|security agency|surveillance act|surveillance program|surveillance programs|warrantless surveillance|warrantless wiretapping")

def importNCData():
	# Go through each directory and get to the files
	for path, dirs, files in os.walk(nc_data_dir, topdown=True):
		for f in files:
			print "checking ... " + f
			filePath = os.path.join(path, f)
			json_data = json.load(codecs.open(filePath, encoding="utf8"))
			fulltext = json_data["description"]
			# Does the text contain a string we're actually looking for?
			m = reg_exp.search(fulltext.lower())
			if m != None:			
				cat_str = dc.escape_string(",".join(json_data["categories"]).encode("utf8")).decode("utf8")	
				top_str = dc.escape_string(",".join(json_data["topics"]).encode("utf8")).decode("utf8")		

				insert_query = "INSERT INTO post (postText, sourceID, title, topics, published_at, link, guid, categories, corpusID) VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d)" % (dc.escape_string(json_data["description"].encode("utf8")).decode("utf8"), json_data["source_guid"], dc.escape_string(json_data["title"].encode("utf8")).decode("utf8"), top_str, json_data["published_at"], json_data["link"], json_data["guid"], cat_str, 1)
							
				dbc.execute(insert_query)


# Note: Asked Knut for new file that will have month / year and blog_url for each entry
def importBlogsData():
	# posts = {}
	csv.field_size_limit(sys.maxsize)
	# csvReader = csv.reader(open(blogs_data_dir+"surv-url-blog-date-keyfreq.txt", 'Ur'), delimiter='\t', quotechar='"')
	# for row in csvReader:		
	# 	if csvReader.line_num > 1:			
	# 		postdate = datetime(int(row[2]), int(row[3]), 1)
	# 		# index a dict by the url and with the blog, year and month of the post
	# 		# if row[0].find("kill-and-dump") != -1:
	# 		# 	print row
	# 		# 	#row[0] = urllib.unquote(row[0]).decode("utf8")
	# 		# 	#row[0] = urllib.quote(row[0])
	# 		posts[row[0]] = [row[1], postdate]

	# Remove header material (which is often boilerplate)
	reg_exp_header = re.compile("(<h>.*?)<p>")
	csvReader = csv.reader(open(blogs_data_dir+"surv-l2.txt", 'Ur'), delimiter='\t', quotechar='"')
	for row in csvReader:		
		postLink = row[0]
		extractTime = row[4]
		postText = row[5]
		postBlog = row[1]
		postDatetime = datetime(int(row[2]), int(row[3]), 1)
		# if postLink in posts:
		# 	postBlog = posts[postLink][0]
		# 	postDatetime = posts[postLink][1]

		guid = hashlib.md5(postLink).hexdigest()
		
		if postText != "":
			# try:
			#m = reg_exp.search(postText)
			#print m
			# print postText
			postText = reg_exp_header.subn("<p>", postText)[0]

			# See if it contains one of the hard matches (need to do this to make comparable to MSM)
			m = reg_exp.search(postText.lower())
			if m != None:	
				# print postText.decode("utf8")
				insert_query = "INSERT INTO post_unique (postText, sourceID, title, topics, published_at, link, guid, categories, corpusID) VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d)" % (dc.escape_string(postText).decode("utf8"), postBlog, "", "", postDatetime, dc.escape_string(postLink).decode("utf8"), guid, "", 2)	

				# except:
				# 	print postBlog
				# 	print dc.escape_string(postLink).decode("utf8")
					#print insert_query				
				dbc.execute(insert_query)

				#print "inserting ... " + str(postLink)
				print csvReader.line_num


def importGuardianData(query):
	# http://beta.content.guardianapis.com/search?from-date=2013-06-01&to-date=2014-06-30&q=security&api-key=tzzg3y3p3j6udqpgvzcyh7zx&show-fields=body,headline&page-size=50

	perpage = 50	
	url_root = "http://beta.content.guardianapis.com/search"
	params = {"from-date": "2013-06-01", "to-date":"2014-06-30", "q": query, "api-key":"tzzg3y3p3j6udqpgvzcyh7zx", "show-fields": "body,headline", "page-size": perpage}	
	r = requests.get(url_root, params=params)	
	r_json = json.loads(r.text)

	num_pages = r_json["response"]["pages"]
	for page in range(1, num_pages):
		params = {"from-date": "2013-06-01", "to-date":"2014-06-30", "q": query, "api-key":"tzzg3y3p3j6udqpgvzcyh7zx", "show-fields": "body,headline", "page-size": perpage, "page": page}	
		r = requests.get(url_root, params=params)	
		r_json = json.loads(r.text)
		print r.url
		for hit in r_json["response"]["results"]:
			date = hit["webPublicationDate"]
			guid = hashlib.md5(hit["id"]).hexdigest()
			if "body" in hit["fields"]:
				bodytext = hit["fields"]["body"]
				headline = hit["fields"]["headline"]
				link = hit["webUrl"]
				m = reg_exp.search(bodytext.lower())
				if m != None:	
					# insert to DB
					insert_query = "INSERT INTO post_unique (postText, sourceID, title, topics, published_at, link, guid, categories, corpusID) VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d)" % (dc.escape_string(bodytext.encode("utf8")).decode("utf8"), "guardian_articles", dc.escape_string(headline.encode("utf8")).decode("utf8"), "", date, dc.escape_string(link.encode("utf8")).decode("utf8"), guid, "", 1)	

					dbc.execute(insert_query)

					print "inserting ... " + str(link)
		sleep(.1)			
		# for page in range(1,10):
		# 	# Query is based on language plus template
		# 	query = "site:spectrum.ieee.org"

		# 	# examples URL: http://otter-hardy.topsy.com/searchhistogram.json?q=%22c%20programming%22&apikey=825A070112B8457FA0018837198E7385&slice=31536000&period=1&count_method=target&maxtime=1385856000
		# 	url_root = "http://otter-hardy.topsy.com/search.json"
			

		# 	#resultVolume = int(r_json["response"]["histogram"][0])		
		# 	#print query + ", " + str(resultVolume)
		# 	resultList = r_json["response"]["list"]
		# 	for t in resultList:
		# 		row = []
		# 		row.append(t["firstpost_date"])
		# 		row.append(t["title"].encode("utf8"))
		# 		row.append(t["url"])
		# 		row.append(t["trackback_author_url"])

# DONE: fisa, wiretapping, prism, retention, nsa, snowden, surveillance, collection, intelligence, security
#importGuardianData("fisa")
# importGuardianData("wiretapping")
# importGuardianData("prism")
# importGuardianData("retention")
# importGuardianData("nsa")
# importGuardianData("snowden")
# importGuardianData("surveillance")
# importGuardianData("collection")
# importGuardianData("intelligence")
# importGuardianData("security")
importBlogsData()

# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/cannabis.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/marijuana.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/pot.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/weed.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/dispensaries.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/trafficking.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/hemp.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/ganja.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/joint.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/hash.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/bong.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/grass.zip



# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/retention.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/snowden.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/surveillance.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/fisa.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/intelligence.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/collection.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/nsa.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/prism.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/retention.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/security.zip
# https://s3.amazonaws.com/lingoscope.newscred.com/term_files/wiretapping.zip
