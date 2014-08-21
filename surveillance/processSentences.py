import sys 
import MySQLdb
import MySQLdb.cursors
import os
import re
import codecs
from nltk.tokenize import SpaceTokenizer, WhitespaceTokenizer, PunktSentenceTokenizer, PunktParameters
from nltk.probability import FreqDist
import nltk.tag, nltk.util
from bs4 import BeautifulSoup
import string

# DONE: fisa, wiretapping, prism, retention, nsa, snowden, surveillance, collection, intelligence, security

dc = MySQLdb.connect(db="lingoscope", user="lingoscoper", passwd="showmethedata", cursorclass=MySQLdb.cursors.DictCursor)
dc.autocommit(True)
dc.set_character_set('utf8')
dbc = dc.cursor()
dbc.execute('SET NAMES utf8;')
dbc.execute('SET CHARACTER SET utf8;')
dbc.execute('SET character_set_connection=utf8;')
dbc.execute('SET session time_zone = "America/New_York";')

# Set up the tokenizer

punkt_param = PunktParameters()
punkt_param.abbrev_types = set(['dr', 'vs', 'mr', 'mrs', 'ms', 'jr', 'NSA', 'ie', 'eg', 'cia', 'st', 'prof', 'inc', 'am', 'pm', 'jan', 'feb', 'mar', 'aug', 'sept', 'oct', 'nov', 'dec', 'no'])
punkt_param.collocations = set(('N', "S", "A"))
tokenizer = PunktSentenceTokenizer(punkt_param)

# Get some posts
query = "SELECT * FROM post  WHERE corpusID = 1 LIMIT 10"					
dbc.execute(query)
posts = dbc.fetchall()

for p in posts:
	text = p["postText"]
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

	# Strip html
	soup = BeautifulSoup(text)
	sentences = tokenizer.tokenize(soup.get_text())

	# setup so we can exclude punctauation (except for single quotes which should preserve contractinos)
	punctuations = set(string.punctuation)
	punctuations.remove("'")	
	for s in sentences:
		for p in punctuations: # includes following characters: !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~
			s = s.replace(p, "")
		print s
		print ""