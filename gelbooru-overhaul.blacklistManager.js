/**
     * @class Class that manages blacklist features
     */
class BlacklistManager {
    /**
     * @typedef  BlacklistEntry
     * @type     {Object}
     * @property {string}  tag        Blacklisted tag
     * @property {boolean} isAnd      Describes if entry includes multiple tags
     * @property {number[]}  hits     Post ids affected by this entry
     * @property {boolean} isDisabled Describes if entry is disabled
     * @property {HTMLElement} [elem] Reference to displayed element
     * 
     * @typedef BlacklistItem
     * @type {Object}
     * @property {string} name
     * @property {string} value
     */
    /**
     * @type {BlacklistEntry[]}
     * @private
     */
    blacklistEntries;
    /**
     * @type {BlacklistItem}
     * @private
     */
    selectedBlacklistItem;
    /**
     * Total list of post ids affected by blacklist
     * @type {number[]}
     */
    totalHits;
    /** @type {Number} */
    totalPosts;

    constructor() {
        if (!this.blacklistItems || this.blacklistItems.length == 0) {
            let item = { name: "Safe mode", value: "rating:q*\nrating:e*" };
            this.addUpdateBlacklist(item);
            let item2 = { name: "No blacklist", value: "" };
            this.addUpdateBlacklist(item2);

            let item3 = { name: "Test", value: "1girl" };
            this.addUpdateBlacklist(item3);
        }
    }

    /**
     * @private
     * @returns {BlacklistItem[]} List of available blacklists
     */
    get blacklistItems() {
        return GM_getValue("blacklists", undefined);
    }
    /**
     * @private
     * @param {BlacklistItem[]} value
     */
    set blacklistItems(value) {
        GM_setValue("blacklists", value);
    }

    /**
     * Adds/updates blacklist item to storage
     * @param {BlacklistItem} item 
     * @private
     */
    addUpdateBlacklist(item) {
        let items = this.blacklistItems;

        if (!items)
            items = [];

        let index = items.findIndex(i => i.name == item.name);

        if (index == -1) {
            items.push(item);
        } else {
            items[index] = item;
        }

        this.blacklistItems = items;

        this.updateSidebarSelect();
    }
    /**
     * Removes blacklist item from storage
     * @param {BlacklistItem} item 
     * @private
     */
    removeBlacklist(item) {
        let index = this.blacklistItems.findIndex(i => i.name == item.name);

        this.blacklistItems.splice(index, 1);

        this.updateSidebarSelect();
    }

    /**
     * Parse current blacklist item's entries
     */
    parseEntries() {
        this.blacklistEntries = [];

        let text = this.selectedBlacklistItem.value;
        let lines = text.split(/[\n|\r\n]/);
        lines = lines.filter((l) => {
            if (["", " ", "\n", "\r\n"].includes(l)) return false; // empty, space or newline
            if (l.startsWith("#") || l.startsWith("//")) return false; // comments

            return true;
        });

        // clear inline comments and trim spaces
        lines.map((l) => {
            return l.replace(/([\/\/|#].*)/, "").trim();
        });

        // clear namespace excep rating:
        lines.map(l => {
            return l.replace(/^(?!rating:)(?:.+:)(.+)$/, "$1");
        });

        let entries = lines.map((l) => {
            /** @type {BlacklistEntry} */
            let entry = {
                tag: l.toLowerCase(),
                isAnd: Boolean(l.match(/ AND | && /)),
                hits: [],
                isDisabled: false
            };
            return entry;
        });

        this.blacklistEntries = entries;
    }

    /**
     * Creates blacklist sidebar placed above tags sidebar
     * @private
     */
    createSidebar() {
        //title
        let titleSpan = document.createElement("span");
        titleSpan.id = "go-advBlacklistTitle";

        let b = document.createElement("b");
        b.textContent = `Blacklist`;

        titleSpan.appendChild(document.createElement("br"));
        titleSpan.appendChild(b);
        titleSpan.appendChild(document.createElement("br"));
        titleSpan.appendChild(document.createElement("br"));

        //select
        let select = document.createElement("select");
        select.id = "go-advBlacklistSelect";
        select.addEventListener("change", e => this.selectedBlacklistChanged(e.target.value));

        //entries
        let entries = document.createElement("ul");
        entries.id = "go-advBlacklistEntries";
        entries.className = "tag-list";

        //insert elements
        let aside = document.querySelector(".aside");
        aside.insertBefore(entries, aside.children[0]);
        aside.insertBefore(select, entries);
        aside.insertBefore(titleSpan, select);
    }
    /**
     * Removes blacklist sidebar placed above tags sidebar
     * @private
     */
    removeSidebar() {
        let aside = document.querySelector(".aside");
        let title = aside.querySelector("#go-advBlacklistTitle");
        let select = aside.querySelector("#go-advBlacklistSelect");
        let entries = aside.querySelector("#go-advBlacklistEntries");


        if (title) {
            title.remove();
            select.remove();
            entries.remove();
        }
    }
    updateSidebarTitle() {
        document.querySelector("#go-advBlacklistTitle").querySelector("b").textContent = `Blacklist ${this.totalHits.length}/${this.totalPosts}`;
    }
    updateSidebarSelect() {
        /** @type {HTMLSelectElement} */
        let select = document.querySelector("#go-advBlacklistSelect");

        while (select.firstChild) select.firstChild.remove();

        if (this.blacklistItems && this.blacklistItems.length > 0) {
            this.blacklistItems.forEach(i => select.appendChild(buildBlacklistItem(i)));
        } else {
            select.appendChild(buildBlacklistItem(null));
        }

        if (this.selectedBlacklistItem) select.value = this.selectedBlacklistItem.name;

        function buildBlacklistItem(i) {
            let opt = document.createElement("option");

            if (i == null) {
                opt.value = "There is no blacklists";
                opt.textContent = "There is no blacklists";
                select.setAttribute("disabled", "");
            } else {
                opt.value = i.name;
                opt.textContent = i.name;
            }

            return opt;
        }
    }
    updateSidebarEntries() {
        let entries = document.querySelector("#go-advBlacklistEntries");

        while (entries.firstChild) entries.firstChild.remove();

        if (this.blacklistEntries)
            this.blacklistEntries.forEach(i => entries.appendChild(buildEntryItem(i)));

        function buildEntryItem(i) {
            let li = document.createElement("li");
            li.className = "tag-type-general";

            let a_tag = document.createElement("a");
            a_tag.textContent = i.tag;

            let span = document.createElement("span");
            span.style.color = "#a0a0a0";
            span.textContent = String(i.hits.length);

            li.appendChild(a_tag);
            li.appendChild(span);

            return li;
        }
    }

    /**
     * Enable/disable blacklist manager
     * @param {boolean} value 
     * @public
     */
    setupManager(value) {
        if (value) {
            this.createSidebar();
            if (this.blacklistItems) this.selectedBlacklistChanged(this.blacklistItems[0].name);
            this.updateSidebarSelect();
        } else {
            this.removeSidebar();
        }
    }
    /**
     * Listeren for blacklist select onchange
     * @param {string} name 
     */
    selectedBlacklistChanged(name) {
        // clear blacklisted posts
        this.selectedBlacklistItem = this.blacklistItems.find(i => i.name == name);

        this.totalHits = [];
        this.totalPosts = 0;

        this.parseEntries();
        this.applyBlacklist();
    }
    
    applyBlacklist(thumbs = null) {
        if (!thumbs) thumbs = utils.getThumbnails();

        this.checkPosts(thumbs).then(() => {
            this.hidePosts(thumbs);
            this.updateSidebarTitle();
            this.updateSidebarEntries();
        });
    }
    async checkPosts(thumbs) {
        await Promise.all(Object.values(thumbs).map(async (t) => {
            let id = Number(/id=([0-9]+)/.exec(t.parentElement.getAttribute("href"))[1]);
            return await utils.loadPostItem(id).then(i => i);
        })).then(items => {
            items.forEach(item => {
                this.totalPosts++;
                if (this.checkPost(item)) {
                    this.totalHits.push(item.id);
                }
            });
        });
    }
    hidePosts(thumbs) {

        thumbs.forEach(t => {
            let id = Number(/id=([0-9]+)/.exec(t.parentElement.getAttribute("href"))[1]);

            t.classList.toggle("go-blacklisted", this.totalHits.includes(id));
        });
    }
    /**
     * 
     * @param {PostItem} item 
     * @returns {boolean} Is post was hit by any entry
     */
    checkPost(item) {
        let isHit = false;

        this.blacklistEntries.forEach(e => {
            if (this.checkEntryHit(item, e)) {
                isHit = true;
                e.hits.push(item.id);
            }
        });

        return isHit;
    }
    /**
     * 
     * @param {PostItem} post 
     * @param {BlacklistEntry} entry 
     * @returns {boolean} Is post was hit with given entry
     */
    checkEntryHit(post, entry) {
        if (entry.isDisabled) return false;

        let postTags = post.tags.artist.concat(post.tags.character, post.tags.copyright, post.tags.general, post.tags.metadata);
        postTags = postTags.concat([`rating:${post.rating}`]);

        if (entry.isAnd) {
            let tags = entry.tag.split(/ AND | && /);
            if (tags.every(t => postTags.some(tt => utils.wildTest(t, tt)))) return true;
        }

        if (postTags.some(tt => utils.wildTest(entry.tag, tt))) return true;

        return false;
    }
}
