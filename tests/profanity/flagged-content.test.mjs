import test from "node:test";
import assert from "node:assert/strict";

/**
 * Server-side helper computing defaultHidden:
 * false for author, moderators, admins;
 * otherwise viewer's profiles.hide_flagged_content (guests: true).
 */
function computeDefaultHidden({ isAuthor = false, isStaff = false, viewerHideFlagged = true } = {}) {
  if (isAuthor || isStaff) return false;
  return viewerHideFlagged ?? true;
}

/**
 * State machine simulating FlaggedContent behavior and DOM output
 */
function simulateFlaggedContent({
  isFlagged = false,
  defaultHidden = true,
  regionId = "test-region-id",
  content = "User post or comment text",
}) {
  if (!isFlagged) {
    return {
      isFlagged: false,
      hidden: false,
      renderedNotice: false,
      renderedBadge: false,
      renderedContent: true,
      html: `<div>${content}</div>`,
    };
  }

  let hidden = Boolean(defaultHidden);

  const render = () => {
    if (hidden) {
      return {
        isFlagged: true,
        hidden: true,
        renderedNotice: true,
        renderedBadge: false,
        renderedContent: false,
        noticeText: "This content may contain inappropriate language.",
        badgeText: null,
        button: {
          type: "button",
          label: "Show",
          ariaLabel: "Show content",
          ariaExpanded: "false",
          ariaControls: regionId,
          minHitArea: 44,
        },
        html: `<div role="group" aria-label="Hidden content"><p>This content may contain inappropriate language.</p><button type="button" aria-expanded="false" aria-controls="${regionId}" aria-label="Show content">Show</button></div>`,
      };
    } else {
      return {
        isFlagged: true,
        hidden: false,
        renderedNotice: false,
        renderedBadge: true,
        renderedContent: true,
        noticeText: null,
        badgeText: "Flagged for language",
        button: {
          type: "button",
          label: "Hide",
          ariaLabel: "Hide content",
          ariaExpanded: "true",
          ariaControls: regionId,
          minHitArea: 44,
        },
        html: `<div><div><span>Flagged for language</span><button type="button" aria-expanded="true" aria-controls="${regionId}" aria-label="Hide content">Hide</button></div><div id="${regionId}">${content}</div></div>`,
      };
    }
  };

  const toggle = () => {
    hidden = !hidden;
    return render();
  };

  return { render, toggle };
}

test("FlaggedContent UI State Machine & Mutual Exclusivity", async (t) => {
  await t.test("1. Normal user viewing someone else's flagged post", () => {
    const defaultHidden = computeDefaultHidden({ isAuthor: false, isStaff: false, viewerHideFlagged: true });
    assert.equal(defaultHidden, true);

    const item = simulateFlaggedContent({ isFlagged: true, defaultHidden });
    const initial = item.render();

    // 1a. Only the notice + Show is visible. Badge and content are NOT rendered.
    assert.equal(initial.hidden, true);
    assert.equal(initial.renderedNotice, true);
    assert.equal(initial.renderedBadge, false);
    assert.equal(initial.renderedContent, false);
    assert.equal(initial.noticeText, "This content may contain inappropriate language.");
    assert.equal(initial.button.label, "Show");
    assert.equal(initial.button.ariaExpanded, "false");
    assert.equal(initial.button.ariaLabel, "Show content");
    assert.ok(!initial.html.includes("Flagged for language"), "Badge must NOT appear in hidden state");

    // 1b. After Show, only badge row + Hide + content is visible. Notice is NOT rendered.
    const afterShow = item.toggle();
    assert.equal(afterShow.hidden, false);
    assert.equal(afterShow.renderedNotice, false);
    assert.equal(afterShow.renderedBadge, true);
    assert.equal(afterShow.renderedContent, true);
    assert.equal(afterShow.badgeText, "Flagged for language");
    assert.equal(afterShow.button.label, "Hide");
    assert.equal(afterShow.button.ariaExpanded, "true");
    assert.equal(afterShow.button.ariaLabel, "Hide content");
    assert.ok(!afterShow.html.includes("This content may contain inappropriate language"), "Notice must NOT appear in shown state");

    // 1c. After Hide, back to the notice.
    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.renderedNotice, true);
    assert.equal(afterHide.renderedBadge, false);
    assert.equal(afterHide.renderedContent, false);
  });

  await t.test("2. Author viewing own flagged post", () => {
    const defaultHidden = computeDefaultHidden({ isAuthor: true, isStaff: false });
    assert.equal(defaultHidden, false);

    const item = simulateFlaggedContent({ isFlagged: true, defaultHidden });
    const initial = item.render();

    // Content shown with badge row and Hide
    assert.equal(initial.hidden, false);
    assert.equal(initial.renderedBadge, true);
    assert.equal(initial.renderedNotice, false);
    assert.equal(initial.renderedContent, true);
    assert.equal(initial.button.label, "Hide");

    // Hide works
    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.renderedNotice, true);
    assert.equal(afterHide.renderedBadge, false);

    // Show works
    const afterShow = item.toggle();
    assert.equal(afterShow.hidden, false);
    assert.equal(afterShow.renderedBadge, true);
    assert.equal(afterShow.renderedNotice, false);
  });

  await t.test("3. Moderator viewing a flagged comment", () => {
    const defaultHidden = computeDefaultHidden({ isAuthor: false, isStaff: true });
    assert.equal(defaultHidden, false);

    const item = simulateFlaggedContent({ isFlagged: true, defaultHidden });
    const initial = item.render();

    assert.equal(initial.hidden, false);
    assert.equal(initial.renderedBadge, true);
    assert.equal(initial.button.label, "Hide");

    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.button.label, "Show");
  });

  await t.test("4. Flagged reply inside a thread, and flagged post on a tag page", () => {
    // Reply inside thread (viewer is normal user)
    const threadReply = simulateFlaggedContent({
      isFlagged: true,
      defaultHidden: computeDefaultHidden({ isAuthor: false, isStaff: false, viewerHideFlagged: true }),
    });
    assert.equal(threadReply.render().hidden, true);
    assert.equal(threadReply.toggle().hidden, false);

    // Tag page post (viewer is normal user)
    const tagPost = simulateFlaggedContent({
      isFlagged: true,
      defaultHidden: computeDefaultHidden({ isAuthor: false, isStaff: false, viewerHideFlagged: true }),
    });
    assert.equal(tagPost.render().hidden, true);
    assert.equal(tagPost.toggle().hidden, false);
  });

  await t.test("5. DOM search: notice text and badge text NEVER appear at the same time for one item", () => {
    const NOTICE_STR = "This content may contain inappropriate language.";
    const BADGE_STR = "Flagged for language";

    for (const initialHidden of [true, false]) {
      const item = simulateFlaggedContent({ isFlagged: true, defaultHidden: initialHidden });
      
      // Check state 1
      const s1 = item.render();
      const hasNotice1 = s1.html.includes(NOTICE_STR);
      const hasBadge1 = s1.html.includes(BADGE_STR);
      assert.ok(!(hasNotice1 && hasBadge1), "Notice and Badge must NEVER coexist simultaneously");
      assert.ok(hasNotice1 || hasBadge1, "Either Notice or Badge must be present when isFlagged=true");

      // Check state 2 (after toggle)
      const s2 = item.toggle();
      const hasNotice2 = s2.html.includes(NOTICE_STR);
      const hasBadge2 = s2.html.includes(BADGE_STR);
      assert.ok(!(hasNotice2 && hasBadge2), "Notice and Badge must NEVER coexist simultaneously after toggle");
      assert.ok(hasNotice2 || hasBadge2, "Either Notice or Badge must be present after toggle");

      // Check state 3 (after second toggle)
      const s3 = item.toggle();
      const hasNotice3 = s3.html.includes(NOTICE_STR);
      const hasBadge3 = s3.html.includes(BADGE_STR);
      assert.ok(!(hasNotice3 && hasBadge3), "Notice and Badge must NEVER coexist simultaneously after second toggle");
    }
  });

  await t.test("6. Keyboard & Accessibility attributes", () => {
    const item = simulateFlaggedContent({ isFlagged: true, defaultHidden: true });
    const hiddenState = item.render();

    assert.equal(hiddenState.button.type, "button");
    assert.equal(hiddenState.button.ariaExpanded, "false");
    assert.equal(hiddenState.button.ariaControls, "test-region-id");
    assert.equal(hiddenState.button.ariaLabel, "Show content");
    assert.ok(hiddenState.button.minHitArea >= 44);

    const shownState = item.toggle();
    assert.equal(shownState.button.type, "button");
    assert.equal(shownState.button.ariaExpanded, "true");
    assert.equal(shownState.button.ariaControls, "test-region-id");
    assert.equal(shownState.button.ariaLabel, "Hide content");
    assert.ok(shownState.button.minHitArea >= 44);
  });
});
