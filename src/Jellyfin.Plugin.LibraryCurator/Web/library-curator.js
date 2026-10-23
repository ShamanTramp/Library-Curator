/* Library Curator: Jellyfin Web 10.11.11 presentation only. */
(function () {
    'use strict';
    if (window.LibraryCurator) { window.LibraryCurator.refresh(); return; }
    const normalize = value => String(value || '').replace(/-/g, '').toLowerCase();
    const splitIds = value => (Array.isArray(value) ? value : String(value || '').split(',')).map(normalize).filter(Boolean);
    let context = null;
    let stopped = false;
    let queued = false;
    const labels = new Map();
    const attributes = new Map();
    let title = null;
    const installedClients = new WeakSet();

    function identity(client) {
        return client && client.getCurrentUserId && client.getCurrentUserId()
            ? client.getUrl('LibraryCurator') + '|' + normalize(client.getCurrentUserId()) : '';
    }
    function restore() {
        for (const [node, value] of labels) {
            if (node.isConnected && node.textContent === value.applied) node.textContent = value.original;
        }
        labels.clear();
        for (const [node, values] of attributes) {
            for (const [attribute, value] of values) if (node.getAttribute(attribute) === value.applied) node.setAttribute(attribute, value.original);
        }
        attributes.clear();
        if (title && document.title === title.applied) document.title = title.original;
        title = null;
    }
    function current(client) {
        const key = identity(client);
        if (!context || context.key !== key) {
            restore();
            context = { key, options: null, pending: null, retryAfter: 0 };
        }
        return context;
    }
    function load(client) {
        const state = current(client);
        if (!state.key || state.options || Date.now() < state.retryAfter) return Promise.resolve(state.options);
        if (!state.pending) {
            let timer;
            state.pending = Promise.race([
                Promise.resolve().then(() => client.getJSON(client.getUrl('LibraryCurator/DisplayOptions'))),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Settings timeout')), 5000); })
            ]).then(options => {
                if (normalize(options.UserId) !== normalize(client.getCurrentUserId()) || identity(client) !== state.key) return null;
                state.options = options;
                queueScan();
                return options;
            }).catch(error => {
                state.retryAfter = Date.now() + 30000;
                console.warn('Library Curator: presentation settings unavailable.', error);
                return null;
            }).finally(() => { clearTimeout(timer); state.pending = null; });
        }
        return state.pending;
    }
    function isCollectionQuery(query, options) {
        const ids = (options.Views || []).filter(view => view.CollectionType === 'boxsets').map(view => normalize(view.Id));
        const kinds = String(query.IncludeItemTypes || '').toLowerCase().split(',');
        return ids.includes(normalize(query.ParentId)) && (!query.IncludeItemTypes || kinds.every(kind => kind === 'boxset'));
    }
    function install(client) {
        if (!client || typeof client.getItems !== 'function' || client.getItems.__libraryCurator || installedClients.has(client)) return;
        const previous = client.getItems;
        const wrapped = async function (userId, query, ...rest) {
            if (stopped || !query || normalize(userId) !== normalize(this.getCurrentUserId())) return previous.apply(this, arguments);
            const key = identity(this);
            const options = await load(this);
            if (!options || identity(this) !== key || !isCollectionQuery(query, options) || !options.HiddenCollectionIds?.length) return previous.apply(this, arguments);
            const merged = [...new Set([...splitIds(query.ExcludeItemIds), ...splitIds(options.HiddenCollectionIds)])];
            return previous.call(this, userId, { ...query, ExcludeItemIds: merged.join(',') }, ...rest);
        };
        wrapped.__libraryCurator = true;
        client.getItems = wrapped;
        installedClients.add(client);
    }
    function idFromLink(link) {
        try {
            const href = link.getAttribute('href') || '';
            const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
            const params = new URLSearchParams(query);
            return normalize(params.get('topParentId') || params.get('parentId') || params.get('id'));
        } catch (_) { return ''; }
    }
    function setLabel(node, text) {
        if (node.nodeType !== 3) {
            const walker = document.createTreeWalker(node, 4);
            let child;
            while ((child = walker.nextNode())) {
                if (child.textContent.trim() && !child.parentElement.closest('.material-icons')) { setLabel(child, text); break; }
            }
            return;
        }
        let previous = labels.get(node);
        if (previous && node.textContent !== previous.applied) { labels.delete(node); previous = null; }
        if (!previous) { previous = { original: node.textContent, applied: text }; labels.set(node, previous); }
        previous.applied = text;
        if (node.textContent !== text) node.textContent = text;
    }
    function rename(options) {
        const name = options.PlaylistLibraryName;
        if (!name) { restore(); return; }
        const ids = new Set((options.Views || []).filter(view => view.CollectionType === 'playlists').map(view => normalize(view.Id)));
        for (const [node] of labels) if (!node.isConnected) labels.delete(node);
        for (const [node] of attributes) if (!node.isConnected) attributes.delete(node);
        const selectors = '.cardText:not(.secondary), .listItemBodyText:not(.secondary), .navMenuOptionText, .MuiListItemText-primary';
        document.querySelectorAll('[data-id], a[href]').forEach(container => {
            const id = normalize(container.getAttribute('data-id')) || idFromLink(container);
            if (!ids.has(id)) return;
            container.querySelectorAll(selectors).forEach(node => setLabel(node, name));
            for (const attribute of ['title', 'aria-label']) {
                if (!container.hasAttribute(attribute)) continue;
                if (!attributes.has(container)) attributes.set(container, new Map());
                const saved = attributes.get(container);
                let value = saved.get(attribute);
                if (!value || container.getAttribute(attribute) !== value.applied) value = { original: container.getAttribute(attribute), applied: name };
                value.applied = name; saved.set(attribute, value);
                if (container.getAttribute(attribute) !== name) container.setAttribute(attribute, name);
            }
            // Some menu links contain a text node alongside the icon, without a label span.
            if (container.matches('a') && !container.querySelector(selectors)) {
                Array.from(container.childNodes).filter(node => node.nodeType === 3 && node.textContent.trim()).forEach(node => setLabel(node, name));
            }
        });
        const route = location.hash || location.pathname + location.search;
        const routeId = idFromLink({ getAttribute: () => route });
        const rootPlaylistRoute = /(?:^|\/)playlists(?:\.html)?(?:\?|$)/i.test(route.replace(/^#\/?/, ''));
        if (ids.has(routeId) || rootPlaylistRoute) {
            document.querySelectorAll('.pageTitle').forEach(node => setLabel(node, name));
            if (!title || document.title !== title.applied) title = { original: document.title, applied: name };
            if (document.title !== name) document.title = name;
        } else {
            document.querySelectorAll('.pageTitle').forEach(node => {
                for (const [textNode, value] of labels) {
                    if (node.contains(textNode)) {
                        if (textNode.textContent === value.applied) textNode.textContent = value.original;
                        labels.delete(textNode);
                    }
                }
            });
            if (title && document.title === title.applied) document.title = title.original;
            title = null;
        }
    }
    function scan() {
        queued = false;
        if (stopped) return;
        const client = window.ApiClient;
        const state = current(client);
        if (!state.key) return;
        install(client);
        if (state.options) rename(state.options);
        else load(client);
    }
    function queueScan() {
        if (!queued && !stopped) { queued = true; queueMicrotask(scan); }
    }
    const observer = new MutationObserver(queueScan);
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-id', 'href'] });
    window.addEventListener('hashchange', queueScan);
    document.addEventListener('viewshow', queueScan);
    const timer = setInterval(() => {
        const client = window.ApiClient;
        if (!context || context.key !== identity(client) || !context.options || (client?.getItems && !installedClients.has(client))) queueScan();
    }, 1000);
    window.LibraryCurator = {
        refresh() { context = null; restore(); queueScan(); },
        dispose() { stopped = true; observer.disconnect(); clearInterval(timer); window.removeEventListener('hashchange', queueScan); document.removeEventListener('viewshow', queueScan); restore(); }
    };
    scan();
})();
