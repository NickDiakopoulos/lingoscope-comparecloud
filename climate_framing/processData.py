import requests # http://docs.python-requests.org/ library useful for scraping
import json
from time import sleep
import csv
import sys 
import numpy as np
from scipy import stats
#reload(sys) # This is actually essentialy to get python to encode and escape the strings properly 
#sys.setdefaultencoding("utf-8")


# load list of climate terms
climateTerms = []
csvFile = open("climate_terms_reduced2.csv", 'Ur')
csvReader = csv.reader(csvFile, delimiter=',', quotechar='"')
for row in csvReader:
	climateTerms.append(row[0])

#climateTerms=["glacier"]

viceTerms = {}
csvFile = open("../data/vice.csv", 'Ur')
csvReader = csv.reader(csvFile, delimiter=',', quotechar='"')
for row in csvReader:
	viceTerms[row[0]+"_adj"] = 1
	viceTerms[row[0]+"_notadj"] = 1

virtueTerms = {}
csvFile = open("../data/virtue.csv", 'Ur')
csvReader = csv.reader(csvFile, delimiter=',', quotechar='"')
for row in csvReader:
	virtueTerms[row[0]+"_adj"] = 1
	virtueTerms[row[0]+"_notadj"] = 1

#print virtueTerms

def termVolume():
	# for each climate term, for each blog type, get sentence context
	for term in climateTerms:
		hits_found = 0
		for blog_class in ["s", "a"]:
			context = "sentence"
			# load in the json
			data = open('data/'+term+'_'+blog_class+'_'+context+'.json')
			try:
				#json_data = json.loads(json.load(data))
				json_data = json.load(data)
				hits_found += json_data["hits_found"]
				
			except:
				print " EXCEPTION "
			
		print term + ", " + str(hits_found)

#termVolume()

def Jensen_Shannon(v1, v2):
	# normalize vectors first
	#v1 = v1 / np.linalg.norm(v1)
	#v2 = v2 / np.linalg.norm(v2)
	# for KL, both vectors must sum to 1
	v1 = v1 / np.sum(v1)
	v2 = v2 / np.sum(v2)

	#print v1
	#print np.sum(v1)

	m = .5 * (v1 + v2)
	# b/c we're using base 2 log, the value should be bounded by 0 and 1
	js = .5 * stats.entropy(v1, m, 2) + .5 * stats.entropy(v2, m, 2)
	return js

def compareVectors():
	fileWriter = csv.writer(open("data/virte_vice_rankings.csv", "w+"),delimiter=",")
	row = ["term", "Virtue Divergence", "Vice Divergence", "Skeptics Virtue", "Acceptors Virtue", "Skeptics Vice", "Acceptors Vice", "Virtue Differential", "Vice Differential", "Skeptics Overall Virtue = Virtue-Vice", "Acceptors Overall Virtue = Virtue-Vice", "Overall Goodness Differential", "Total Volume", "Skeptic Volume", "Acceptor Volume"]	
	fileWriter.writerow(row)
	# for each climate term, for each blog type, get sentence context
	for term in climateTerms:
		vector = {}
		vector["s"] = {}
		vector["a"] = {}
		hits_found_class = {}
		#hits_found_both_classes = 0
		for blog_class in ["s", "a"]:
			context = "sentence"
			# load in the json
			data = open('data/'+term+'_'+blog_class+'_'+context+'.json')
			json_data = json.load(data)
			hits_found = json_data["hits_found"]
			#hits_found_both_classes += json_data["hits_found"]
			hits_found_class[blog_class] = json_data["hits_found"]

			for context_term in json_data["term_set"]:
				token = context_term["term"] + "_" + context_term["pos"].replace(" ", "")
				value = [float(context_term["context_hits"]) / float(hits_found), int(context_term["context_hits"])]
				vector[blog_class][token] = value
				#print context_term["context_hits"]

			#print len(json_data["term_set"])
		
		# create the vocabulary	
		# filter if the context word has been used less than X times across both vectors
		low_freq_thresh = 10 # number of times a context word needs to be used across both vectors
		vocab = {}
		for k in vector["s"]:
			if k in vector["a"]:
				if (vector["s"][k][1] + vector["a"][k][1]) >= low_freq_thresh:
					vocab[k] = 1

		
		# now filter vocab into two buckets for virtue and vice
		virtue_vocab = {}
		vice_vocab = {}
		for k in vocab:
			if k in virtueTerms:
				virtue_vocab[k] = 1
			if k in viceTerms:
				vice_vocab[k] = 1

		dict_virtue = {}
		dict_virtue["s"] = {}
		dict_virtue["a"] = {}
		dict_vice = {}
		dict_vice["s"] = {}
		dict_vice["a"] = {}
		vector_virtue = {}
		vector_virtue["s"] = []
		vector_virtue["a"] = []
		vector_vice = {}
		vector_vice["s"] = []
		vector_vice["a"] = []
		# Create dicts and vectors for s and a for virtue and vice
		for blog_class in ["s", "a"]:
			for k in virtue_vocab:
				if k in vector[blog_class]:
					dict_virtue[blog_class][k] = vector[blog_class][k][0]
			for k in vice_vocab:
				if k in vector[blog_class]:
					dict_vice[blog_class][k] = vector[blog_class][k][0]
			
			# put stuff in vectors
			for k in dict_virtue[blog_class]:
				vector_virtue[blog_class].append(dict_virtue[blog_class][k])

			for k in dict_vice[blog_class]:
				vector_vice[blog_class].append(dict_vice[blog_class][k])

			vector_virtue[blog_class] = np.array(vector_virtue[blog_class])
			vector_vice[blog_class] = np.array(vector_vice[blog_class])

		
		virtue_js = Jensen_Shannon(vector_virtue["s"], vector_virtue["a"])
		vice_js = Jensen_Shannon(vector_vice["s"], vector_vice["a"])

		row = [term, virtue_js, vice_js, np.mean(vector_virtue["s"]), np.mean(vector_virtue["a"]), np.mean(vector_vice["s"]), np.mean(vector_vice["a"]), np.mean(vector_virtue["s"])-np.mean(vector_virtue["a"]), np.mean(vector_vice["s"])-np.mean(vector_vice["a"]), np.mean(vector_virtue["s"])-np.mean(vector_vice["s"]),  np.mean(vector_virtue["a"])-np.mean(vector_vice["a"]), (np.mean(vector_virtue["s"])-np.mean(vector_vice["s"]))-(np.mean(vector_virtue["a"])-np.mean(vector_vice["a"])), hits_found_class["s"]+hits_found_class["a"], hits_found_class["s"], hits_found_class["a"]]
		fileWriter.writerow(row)

		print term
		#print term + ", " + str(virtue_js) + ", " + str(vice_js) + ", " + str(np.sum(vector_virtue["s"])) + ", " + str(np.sum(vector_virtue["a"])) + ", " + str(np.sum(vector_vice["s"])) + ", " + str(np.sum(vector_vice["a"]))
		#print len(vocab)
		#print virtue_vocab
		#print len(virtue_vocab)

		#print vice_vocab
		#print len(vice_vocab)

		# stats.entropy(P, Q, 2) is same as KL-divergence

compareVectors()

def removeTimeline():
	for term in climateTerms:
		for blog_class in ["s", "a"]:
			context = "sentence"
			# load in the json
			data = open('data/'+term+'_'+blog_class+'_'+context+'.json')
			try:
				json_data = json.loads(json.load(data))
				for context_term in json_data["term_set"]:
					del context_term["timeline"]
				with open('data/'+term+'_'+blog_class+'_'+context+'_notime.json', 'w') as outfile:
						json.dump(json_data, outfile)
			except:
				print " EXCEPTION "

#removeTimeline()

def uniqueURLList():
	urls = {}
	csvFile = open("../data/date-community-sceptic-dump.recoded-2.csv", 'rb')
	csvReader = csv.reader(csvFile, delimiter='\t', quotechar='"')
	for row in csvReader:
		try:
			if row[4] == "s" or row[4] == "a":
				urls[row[1]] = 1
		except:
			print " EXCEPTION "

	for url in urls:
		print url


#uniqueURLList()












