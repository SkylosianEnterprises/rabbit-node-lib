NEWVERSION=$(shell node scripts/findNextBuild.js package.json)
PACKAGE=$(shell node scripts/findPackageName.js package.json)
TARBALL=$(PACKAGE)-$(NEWVERSION).tgz

all: test

test: deps
	jasmine-node tests

deps:
	npm install .

package: clean
	node scripts/setVersion.js package.json $(NEWVERSION) > package.json.new && mv package.json.new package.json
	npm pack
	mv $(TARBALL) packages/
	ln -f -s packages/$(TARBALL) $(PACKAGE)-latest.tar.gz
	git add package.json packages/$(TARBALL) $(PACKAGE)-latest.tar.gz
	git commit $(PACKAGE)-latest.tar.gz package.json packages/$(TARBALL) -m 'add package version $(NEWVERSION)'
	@echo Probably want to push the change \(git push origin master\)!

clean:
	rm -rf node_modules

.PHONY: all test deps clean 
