import sys 
import MySQLdb
import MySQLdb.cursors
import os
import re
import codecs
from nltk.tokenize import SpaceTokenizer, WhitespaceTokenizer, PunktSentenceTokenizer, PunktParameters
from nltk.probability import FreqDist
from nltk.corpus import stopwords
import nltk.tag, nltk.util
from bs4 import BeautifulSoup
import string
import csv
import json
import time


# DONE: fisa, wiretapping, prism, retention, nsa, snowden, surveillance, collection, intelligence, security

dc = MySQLdb.connect(db="lingoscope", user="lingoscoper", passwd="showmethedata", cursorclass=MySQLdb.cursors.SSDictCursor)
dc.autocommit(True)
dc.set_character_set('utf8')
dbc = dc.cursor()
dbc.execute('SET NAMES utf8;')
dbc.execute('SET CHARACTER SET utf8;')
dbc.execute('SET character_set_connection=utf8;')
dbc.execute('SET session time_zone = "America/New_York";')

stopword_list = stopwords.words('english')

# Set up the tokenizer
punkt_param = PunktParameters()
punkt_param.abbrev_types = set(['dr', 'vs', 'mr', 'mrs', 'ms', 'jr', 'NSA', 'ie', 'eg', 'cia', 'st', 'prof', 'inc', 'am', 'pm', 'jan', 'feb', 'mar', 'aug', 'sept', 'oct', 'nov', 'dec', 'no'])
punkt_param.collocations = set(('N', "S", "A"))
stokenizer = PunktSentenceTokenizer(punkt_param)
tokenizer = WhitespaceTokenizer()

# ssh -i lingscope.cer ec2-user@ec2-54-210-30-136.compute-1.amazonaws.com
# ssh -i lingscope.cer ec2-user@ec2-54-86-113-222.compute-1.amazonaws.com

def cleanAndNormalizeText(text):
	text = text.replace("N.S.A.", "NSA")
	text = text.replace("C.I.A.", "CIA")
	text = text.replace("F.B.I.", "FBI")
	text = text.replace("U.S.", "US")
	text = text.replace("U.S.A.", "USA")
	text = text.replace("U.N.", "UN")
	text = text.replace("S.E.C.", "SEC")
	text = text.replace("N.S.C.", "NSC")
	text = text.replace("I.R.S.", "IRS")
	text = text.replace("F.A.A.", "FAA")
	text = text.replace("D.O.D.", "DOD")
	text = text.replace("D.O.C.", "DOC")
	text = text.replace("D.O.E.", "DOE")
	text = text.replace("D.O.T.", "DOT")
	text = text.replace("D.I.A.", "DIA")
	text = text.replace("D.E.A.", "DEA")
	text = text.replace("A.C.L.U.", "ACLU")

	text = text.decode('utf8')
	table = {
		ord(u'\u2018') : u"'",
		ord(u'\u2019') : u"'",
		ord(u'\u201C') : u'',
		ord(u'\u201d') : u'',
		ord(u'\u2026') : u'',
		ord(u'\u2014') : u'', # get rid of em dashes
	}
	text = text.translate(table)
	text = text.encode("utf8")
	return text

def tokenizeText(text):
	text = cleanAndNormalizeText(text)

	# Strip html
	soup = BeautifulSoup(text)
	#sentences = stokenizer.tokenize(soup.get_text())
	text = soup.get_text()

	# setup so we can exclude punctauation (except for single quotes which should preserve contractinos)
	punctuations = set(string.punctuation)
	punctuations.remove("'")	
	# for s in sentences:
	for p in punctuations: # includes following characters: !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~
		text = text.replace(p, "")
	text = text.lower()
	# tokenize the sentence and add to tokens array
	toks = tokenizer.tokenize(text)
	toks = [w for w in toks if w not in stopword_list]

	return toks


def tokenizeSentences(text, filterOn=None):
	out_sentences = []
	# setup so we can exclude punctauation (except for single quotes which should preserve contractinos)
	punctuations = set(string.punctuation)
	punctuations.remove("'")	

	text = cleanAndNormalizeText(text)
	
	# Strip html
	soup = BeautifulSoup(text)
	text = soup.get_text()

	# quick test to see if the post even contains the filter term, if it's nowhere then we don't need to continue processing post
	if filterOn != None:
		reg_exp = re.compile(filterOn)
		m = reg_exp.search(text.lower())
		if m == None:	
			return out_sentences

	sentences = stokenizer.tokenize(text)
	for text in sentences:
		# for s in sentences:
		for p in punctuations: # includes following characters: !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~
			text = text.replace(p, "")
		text = text.lower()
		# tokenize the sentence and add to tokens array
		toks = tokenizer.tokenize(text)
		toks = [w for w in toks if w not in stopword_list]
		
		if filterOn == None:
			out_sentences.append(toks)
		elif filterOn != None and filterOn in toks:
			del toks[toks.index(filterOn)]
			out_sentences.append(toks)

	return out_sentences


def analyzeCorpusFreq(outfile, corpusID):
	fd = FreqDist()
	fileWriter = csv.writer(open(outfile, "w+"),delimiter=",")

	index = 0
	query = "SELECT * FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID
	dbc.execute(query)

	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		toks = tokenizeText(text)		
		fd.update(toks)
		#tokens.extend(toks)

	# export unigrams and frequencies
	for (i, (key, val)) in enumerate(fd.items()):
		fileWriter.writerow([key.encode("utf8"), val])	


# Compute the # posts where a token appeared
def analyzeCorpusRate(outfile, corpusID):
	fd = FreqDist()
	fdPost = FreqDist()
	fileWriter = csv.writer(open(outfile, "w+"),delimiter=",")

	# get total number of posts in corpus
	query = "SELECT count(*) as cnt FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID
	dbc.execute(query)
	for p in dbc:
		postCount = p["cnt"]

	index = 0
	query = "SELECT * FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID
	dbc.execute(query)

	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		toks = tokenizeText(text)	

		# fd post is a freq dist for just this post, and used to collapse counts to only 1 per unigram per post
		fdPost.clear()
		fdPost.update(toks)
	
		fd.update(fdPost.keys())

	# export unigrams and frequencies
	for (i, (key, val)) in enumerate(fd.items()):
		# key, freq (# posts), rate (# posts / # total posts)
		fileWriter.writerow([key.encode("utf8"), val, float(val) / float(postCount)])		


def outputCorpusTerms(corpusID, filterBelowRate):
	fdUniquePosts = FreqDist()
	fdUniqueSentences = FreqDist()
	fdPostTemp = FreqDist()
	fdSentenceTemp = FreqDist()
	sentenceCount = 0

	# get total number of posts in corpus
	query = "SELECT count(*) as cnt FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID
	dbc.execute(query)
	for p in dbc:
		postCount = p["cnt"]

	query = "SELECT * FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID
	dbc.execute(query)

	index = 0
	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		sentences = tokenizeSentences(text)	
		sentenceCount = sentenceCount + len(sentences)
		
		fdPostTemp.clear()
		for s in sentences:
			fdPostTemp.update(s)
			fdSentenceTemp.clear()
			fdSentenceTemp.update(s)
			fdUniqueSentences.update(fdSentenceTemp.keys()) # number of unique sentences where each term appears 1 or more times
	
		fdUniquePosts.update(fdPostTemp.keys()) # Number of unique posts where each term appears 1 or more times


	# export unigrams and frequencies
	# build dict
	output = {}
	output["corpusID"] = corpusID
	output["totalPosts"] = postCount
	output["totalSentences"] = sentenceCount
	terms = []
	for (i, (term, postHits)) in enumerate(fdUniquePosts.items()):
		# Don't output terms whose prevalence is less than filter value
		if float(postHits) / float(postCount) > filterBelowRate:
			sentenceHits = fdUniqueSentences[term]
			terms.append({"term": term, "postHits": int(postHits), "sentenceHits": int(sentenceHits)})		
	output["terms"] = terms


	f = codecs.open("data/corpusPrevalence_"+str(corpusID)+".json", "w", encoding="utf8")
	json.dump(output, f, ensure_ascii=False)
	f.close()

# Have to output 2 corpora for comparison as the same time, otherwise you might filter a word from one but have it in the other (which would lead to inaccurate comparison)
def outputDualCorpusTerms(corpusID1, corpusID2, filterBelowRate):
	fdUniquePosts1 = FreqDist()
	fdUniqueSentences1 = FreqDist()
	fdPostTemp1 = FreqDist()
	fdSentenceTemp1 = FreqDist()
	sentenceCount1 = 0

	# get total number of posts in corpus 1
	query = "SELECT count(*) as cnt FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID1
	dbc.execute(query)
	for p in dbc:
		postCount1 = p["cnt"]

	query = "SELECT * FROM post_unique WHERE corpusID = %d AND in_sample = 1" % corpusID1
	dbc.execute(query)

	index = 0
	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		sentences = tokenizeSentences(text)	
		sentenceCount1 = sentenceCount1 + len(sentences)
		
		fdPostTemp1.clear()
		for s in sentences:
			fdPostTemp1.update(s)
			fdSentenceTemp1.clear()
			fdSentenceTemp1.update(s)
			fdUniqueSentences1.update(fdSentenceTemp1.keys()) # number of unique sentences where each term appears 1 or more times
	
		fdUniquePosts1.update(fdPostTemp1.keys()) # Number of unique posts where each term appears 1 or more times
	

	fdUniquePosts2 = FreqDist()
	fdUniqueSentences2 = FreqDist()
	fdPostTemp2 = FreqDist()
	fdSentenceTemp2 = FreqDist()
	sentenceCount2 = 0

	# get total number of posts in corpus 1
	query = "SELECT count(*) as cnt FROM post_unique WHERE corpusID = %d" % corpusID2
	dbc.execute(query)
	for p in dbc:
		postCount2 = p["cnt"]

	query = "SELECT * FROM post_unique WHERE corpusID = %d" % corpusID2
	dbc.execute(query)

	index = 0
	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		sentences = tokenizeSentences(text)	
		sentenceCount2 = sentenceCount2 + len(sentences)
		
		fdPostTemp2.clear()
		for s in sentences:
			fdPostTemp2.update(s)
			fdSentenceTemp2.clear()
			fdSentenceTemp2.update(s)
			fdUniqueSentences2.update(fdSentenceTemp2.keys()) # number of unique sentences where each term appears 1 or more times
	
		fdUniquePosts2.update(fdPostTemp2.keys()) # Number of unique posts where each term appears 1 or more times

	# build dict for output
	output1 = {}
	output1["corpusID"] = corpusID1
	output1["totalPosts"] = postCount1
	output1["totalSentences"] = sentenceCount1
	terms1 = []
	for (i, (term, postHits1)) in enumerate(fdUniquePosts1.items()):
		# Don't output terms whose prevalence is less than filter value
		# Have to check prevalence in both corpora in order to include terms that are above thresh in either
		if float(postHits1) / float(postCount1) > filterBelowRate or float(fdUniquePosts2[term]) / float(postCount2) > filterBelowRate:
			sentenceHits1 = fdUniqueSentences1[term]
			terms1.append({"term": term, "postHits": int(postHits1), "sentenceHits": int(sentenceHits1)})		
	output1["terms"] = terms1

	f = codecs.open("data/corpusPrevalence_"+str(corpusID1)+".json", "w", encoding="utf8")
	json.dump(output1, f, ensure_ascii=False)
	f.close()

	output2 = {}
	output2["corpusID"] = corpusID2
	output2["totalPosts"] = postCount2
	output2["totalSentences"] = sentenceCount2
	terms2 = []
	for (i, (term, postHits2)) in enumerate(fdUniquePosts2.items()):
		# Don't output terms whose prevalence is less than filter value
		if float(postHits2) / float(postCount2) > filterBelowRate or float(fdUniquePosts1[term]) / float(postCount1) > filterBelowRate:
			sentenceHits2 = fdUniqueSentences2[term]
			terms2.append({"term": term, "postHits": int(postHits2), "sentenceHits": int(sentenceHits2)})		
	output2["terms"] = terms2

	f = codecs.open("data/corpusPrevalence_"+str(corpusID2)+".json", "w", encoding="utf8")
	json.dump(output2, f, ensure_ascii=False)
	f.close()


def outputContextTerms(corpusID, filterBelowRate, startIndex):
	f = codecs.open("data/corpusPrevalence_"+str(corpusID)+".json", "r", encoding="utf8")
	corpusPrevalence = json.load(f)
	totalPosts = corpusPrevalence["totalPosts"]
	totalSentences = corpusPrevalence["totalSentences"]
	for j, anchorTerm in enumerate(corpusPrevalence["terms"]):	
		print str(j) + " " + anchorTerm["term"]	
		if j >= startIndex:
			fdUniquePosts = FreqDist()
			fdUniqueSentences = FreqDist()
			fdPostTemp = FreqDist()
			fdSentenceTemp = FreqDist()
			query = "SELECT * FROM post_uniqe WHERE corpusID = %d AND in_sample = 1" % corpusID
			dbc.execute(query)
			index = 0
			anchorPostHits = anchorTerm["postHits"]
			anchorSentenceHits = anchorTerm["sentenceHits"]
			timeinc = 0
			for p in dbc:
				
				index = index + 1
				if index % 500 == 0:
					print anchorTerm["term"] + " " + str(index)
					#time.sleep(.500) 
 				
 				
 				t0 = time.time()
				sentences = tokenizeSentences(p["postText"], anchorTerm["term"])	
				t1 = time.time()
				
				fdPostTemp.clear()
				for s in sentences:
					fdPostTemp.update(s)
					fdSentenceTemp.clear()
					fdSentenceTemp.update(s)
					fdUniqueSentences.update(fdSentenceTemp.keys()) # number of unique sentences where each term appears 1 or more times
			
				fdUniquePosts.update(fdPostTemp.keys()) # Number of unique posts where each term appears 1 or more times

				
				timeinc = timeinc + t1-t0
				if index % 100 == 0:
					print timeinc
					timeinc = 0
				#print t1-t0

			output = {}
			output["corpusID"] = corpusID
			output["totalPosts"] = totalPosts
			output["totalSentences"] = totalSentences
			output["anchorTerm"] = anchorTerm["term"]
			output["anchorTermPostHits"] = anchorPostHits
			output["anchorTermSentenceHits"] = anchorSentenceHits
			terms = []
			for (i, (term, postHits)) in enumerate(fdUniquePosts.items()):
				# Don't output terms whose prevalence is less than filter value
				if float(postHits) / float(anchorPostHits) > filterBelowRate:
					sentenceHits = fdUniqueSentences[term]
					terms.append({"term": term, "postHits": int(postHits), "sentenceHits": int(sentenceHits)})		
			output["terms"] = terms


			f = codecs.open("data/corpusPrevalence_"+str(corpusID)+"_"+anchorTerm["term"]+".json", "w", encoding="utf8")
			json.dump(output, f, ensure_ascii=False)
			f.close()


def saveSentences():
	# get total number of posts in corpus
	query = "SELECT * FROM post_unique WHERE in_sample = 1"
	dbc.execute(query)
	
	index = 0
	for p in dbc:
		print index
		index = index + 1

		text = p["postText"]
		sentences = tokenizeSentences(text)		
		
		for s in sentences:
			print s
			

	



data_dir = "/home/nad/webapps/lingoscope/surveillance/data/"

def generateComputedTermsJSON():
	# Go through each directory and get to the files
	# Generate a list of words where I have context data for both, this is the set of words that is typeahead enabled in the UI
	c_dict = {}	
	for path, dirs, files in os.walk(data_dir, topdown=True):
		for f in files:
			#print "checking ... " + f
			f = f.replace(".json", "")
			if f.find("corpusPrevalence_1_") != -1:
				f = f.replace("corpusPrevalence_1_", "")
				if f not in c_dict:
					c_dict[f] = 1
				else:
					c_dict[f] = c_dict[f] + 1
			if f.find("corpusPrevalence_2_") != -1:
				f = f.replace("corpusPrevalence_2_", "")
				if f not in c_dict:
					c_dict[f] = 1
				else:
					c_dict[f] = c_dict[f] + 1
			
	output = {}	
	terms = []
	for t in c_dict:
		if c_dict[t] == 2:
			terms.append({"term": t})
	output["terms"] = terms

	f = codecs.open("data/corpusComputedTerms.json", "w", encoding="utf8")
	json.dump(output, f, ensure_ascii=False)
	f.close()
		
			# filePath = os.path.join(path, f)
			# json_data = json.load(codecs.open(filePath, encoding="utf8"))
			# fulltext = json_data["description"]
			# # Does the text contain a string we're actually looking for?
			# m = reg_exp.search(fulltext.lower())
			# if m != None:			
			# 	cat_str = dc.escape_string(",".join(json_data["categories"]).encode("utf8")).decode("utf8")	
			# 	top_str = dc.escape_string(",".join(json_data["topics"]).encode("utf8")).decode("utf8")		

			# 	insert_query = "INSERT INTO post (postText, sourceID, title, topics, published_at, link, guid, categories, corpusID) VALUES('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d)" % (dc.escape_string(json_data["description"].encode("utf8")).decode("utf8"), json_data["source_guid"], dc.escape_string(json_data["title"].encode("utf8")).decode("utf8"), top_str, json_data["published_at"], json_data["link"], json_data["guid"], cat_str, 1)
							
			# 	dbc.execute(insert_query)


#analyzeCorpus("nc_surveillance_unigrams.csv", 1)
#analyzeCorpusFreq("blogs_surveillance_unigrams.csv", 2)
#analyzeCorpusRate("nc_surveillance_unigrams_rate.csv", 1)
#analyzeCorpusRate("blogs_surveillance_unigrams_rate.csv", 2)

#outputCorpusTerms(1, .05)
#outputCorpusTerms(2, .05)
#outputDualCorpusTerms(1, 2, .05)

#generateComputedTermsJSON()

#outputContextTerms(1, .01, 116)
#outputContextTerms(2, .01, 35)

saveSentences()
