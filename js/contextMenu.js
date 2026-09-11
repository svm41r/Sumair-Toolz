/**
 * Sumair Tools — Native Right-Click Context Menu Engine
 * Cut, Copy, Paste, and Select All with Cyber-Spider Dark Theme
 * Engineered by Sumair Ali Siddiqui
 * All Rights Reserved (c) 2026
 */

(function () {
    'use strict';

    // Inject CSS for custom context menu
    var styleEl = document.createElement('style');
    styleEl.id = 'st-context-menu-styles';
    styleEl.innerHTML = `
        .st-ctx-menu {
            position: fixed;
            z-index: 999999;
            background: rgba(13, 13, 18, 0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 0, 60, 0.4);
            border-radius: 14px;
            box-shadow: 0 15px 45px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 0, 60, 0.25);
            padding: 6px;
            min-width: 180px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;
            font-size: 12px;
            user-select: none;
            -webkit-user-select: none;
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 0.12s ease, transform 0.12s ease;
            pointer-events: none;
        }
        .st-ctx-menu.st-ctx-visible {
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }
        .st-ctx-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            color: #d4d4d8;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.12s ease;
            font-weight: 600;
            gap: 10px;
        }
        .st-ctx-item:hover:not(.st-ctx-disabled) {
            background: rgba(255, 0, 60, 0.15);
            color: #ffffff;
            box-shadow: inset 2px 0 0 #ff003c;
            transform: translateX(2px);
        }
        .st-ctx-item.st-ctx-disabled {
            opacity: 0.35;
            cursor: not-allowed;
            color: #71717a;
        }
        .st-ctx-item .st-ctx-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .st-ctx-item .st-ctx-icon {
            font-size: 14px;
            width: 16px;
            text-align: center;
        }
        .st-ctx-item .st-ctx-shortcut {
            font-size: 10px;
            color: #71717a;
            font-family: monospace;
            letter-spacing: 0.5px;
        }
        .st-ctx-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
            margin: 4px 6px;
        }
    `;
    document.head.appendChild(styleEl);

    // Context Menu DOM Container
    var menu = document.createElement('div');
    menu.className = 'st-ctx-menu';
    menu.id = 'st-custom-context-menu';
    menu.innerHTML = `
        <div class="st-ctx-item" id="st-ctx-cut">
            <div class="st-ctx-left"><span class="st-ctx-icon">✂️</span><span>Cut</span></div>
            <span class="st-ctx-shortcut">Ctrl+X</span>
        </div>
        <div class="st-ctx-item" id="st-ctx-copy">
            <div class="st-ctx-left"><span class="st-ctx-icon">📋</span><span>Copy</span></div>
            <span class="st-ctx-shortcut">Ctrl+C</span>
        </div>
        <div class="st-ctx-item" id="st-ctx-paste">
            <div class="st-ctx-left"><span class="st-ctx-icon">📥</span><span>Paste</span></div>
            <span class="st-ctx-shortcut">Ctrl+V</span>
        </div>
        <div class="st-ctx-divider"></div>
        <div class="st-ctx-item" id="st-ctx-select-all">
            <div class="st-ctx-left"><span class="st-ctx-icon">🔲</span><span>Select All</span></div>
            <span class="st-ctx-shortcut">Ctrl+A</span>
        </div>
    `;
    document.body.appendChild(menu);

    var targetElement = null;

    function isEditableTarget(el) {
        if (!el) return false;
        var tag = el.tagName ? el.tagName.toUpperCase() : '';
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable || el.getAttribute('contenteditable') === 'true';
    }

    function getSelectedText(el) {
        if (isEditableTarget(el) && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
            return el.value.substring(el.selectionStart, el.selectionEnd);
        }
        var winSel = window.getSelection ? window.getSelection().toString() : '';
        return winSel || '';
    }

    function insertTextAtCursor(el, text) {
        if (!el || !text) return;
        el.focus();
        if (typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
            var start = el.selectionStart;
            var end = el.selectionEnd;
            var val = el.value;
            el.value = val.substring(0, start) + text + val.substring(end);
            el.selectionStart = el.selectionEnd = start + text.length;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (document.execCommand) {
            document.execCommand('insertText', false, text);
        }
    }

    function hideContextMenu() {
        menu.classList.remove('st-ctx-visible');
    }

    // Context Menu Event Listener
    document.addEventListener('contextmenu', function (e) {
        // Prevent default browser menu
        e.preventDefault();

        targetElement = e.target;
        var isEditable = isEditableTarget(targetElement);
        var selectedText = getSelectedText(targetElement);

        var cutBtn = document.getElementById('st-ctx-cut');
        var copyBtn = document.getElementById('st-ctx-copy');
        var pasteBtn = document.getElementById('st-ctx-paste');
        var selectAllBtn = document.getElementById('st-ctx-select-all');

        // Configure Cut button
        if (isEditable && selectedText.length > 0) {
            cutBtn.classList.remove('st-ctx-disabled');
        } else {
            cutBtn.classList.add('st-ctx-disabled');
        }

        // Configure Copy button
        if (selectedText.length > 0) {
            copyBtn.classList.remove('st-ctx-disabled');
        } else {
            copyBtn.classList.add('st-ctx-disabled');
        }

        // Configure Paste button
        if (isEditable) {
            pasteBtn.classList.remove('st-ctx-disabled');
        } else {
            pasteBtn.classList.add('st-ctx-disabled');
        }

        // Select all is always available
        selectAllBtn.classList.remove('st-ctx-disabled');

        // Position menu intelligently within viewport boundaries
        var mouseX = e.clientX;
        var mouseY = e.clientY;
        var menuWidth = 190;
        var menuHeight = 160;

        if (mouseX + menuWidth > window.innerWidth) {
            mouseX = window.innerWidth - menuWidth - 12;
        }
        if (mouseY + menuHeight > window.innerHeight) {
            mouseY = window.innerHeight - menuHeight - 12;
        }

        menu.style.left = Math.max(10, mouseX) + 'px';
        menu.style.top = Math.max(10, mouseY) + 'px';

        menu.classList.add('st-ctx-visible');
    });

    // Action Handlers
    document.getElementById('st-ctx-cut').addEventListener('click', function (e) {
        e.stopPropagation();
        if (this.classList.contains('st-ctx-disabled')) return;
        var selectedText = getSelectedText(targetElement);
        if (selectedText) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(selectedText);
            } else {
                document.execCommand('copy');
            }
            if (isEditableTarget(targetElement)) {
                var start = targetElement.selectionStart;
                var end = targetElement.selectionEnd;
                targetElement.value = targetElement.value.substring(0, start) + targetElement.value.substring(end);
                targetElement.selectionStart = targetElement.selectionEnd = start;
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        hideContextMenu();
    });

    document.getElementById('st-ctx-copy').addEventListener('click', function (e) {
        e.stopPropagation();
        if (this.classList.contains('st-ctx-disabled')) return;
        var selectedText = getSelectedText(targetElement);
        if (selectedText) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(selectedText);
            } else {
                document.execCommand('copy');
            }
        }
        hideContextMenu();
    });

    document.getElementById('st-ctx-paste').addEventListener('click', async function (e) {
        e.stopPropagation();
        if (this.classList.contains('st-ctx-disabled')) return;
        if (isEditableTarget(targetElement)) {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    var clipText = await navigator.clipboard.readText();
                    insertTextAtCursor(targetElement, clipText);
                } else {
                    targetElement.focus();
                    document.execCommand('paste');
                }
            } catch (err) {
                // Fallback for permissions
                targetElement.focus();
                document.execCommand('paste');
            }
        }
        hideContextMenu();
    });

    document.getElementById('st-ctx-select-all').addEventListener('click', function (e) {
        e.stopPropagation();
        if (isEditableTarget(targetElement)) {
            targetElement.focus();
            targetElement.select();
        } else if (targetElement) {
            var range = document.createRange();
            range.selectNodeContents(targetElement);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        hideContextMenu();
    });

    // Dismiss on click outside, scroll, resize, or Escape
    document.addEventListener('click', function (e) {
        if (!menu.contains(e.target)) hideContextMenu();
    });
    window.addEventListener('scroll', hideContextMenu, true);
    window.addEventListener('resize', hideContextMenu);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') hideContextMenu();
    });

})();
