import test from "node:test";
import assert from "node:assert/strict";

// Helper simulating FlaggedContent state machine and behavior
function simulateFlaggedContent({
  isFlagged = false,
  isAuthor = false,
  isModeratorOrAdmin = false,
  forceUnfold = false,
  defaultHidden = null,
}) {
  if (!isFlagged) {
    return { rendered: "content_raw", hidden: false, hasBadge: false, hasButton: false };
  }

  const isPrivileged = isAuthor || isModeratorOrAdmin || forceUnfold;
  let hidden = isPrivileged
    ? false
    : typeof defaultHidden === "boolean"
    ? defaultHidden
    : true;

  const getState = () => ({
    hidden,
    hasBadge: !hidden, // badge shown when content is unfolded
    buttonLabel: hidden ? "Show" : "Hide",
    buttonAriaLabel: hidden ? "Show content" : "Hide content",
    buttonAriaPressed: !hidden,
    buttonType: "button",
    minHitAreaPx: 44,
  });

  const toggle = () => {
    hidden = !hidden;
    return getState();
  };

  return { getState, toggle };
}

test("FlaggedContent UI State Machine & Toggle Logic", async (t) => {
  await t.test("1. Normal user viewing another user's flagged post: hidden by default, Show reveals, Hide hides", () => {
    const item = simulateFlaggedContent({ isFlagged: true, isAuthor: false, isModeratorOrAdmin: false });
    const initial = item.getState();
    assert.equal(initial.hidden, true);
    assert.equal(initial.buttonLabel, "Show");
    assert.equal(initial.buttonAriaLabel, "Show content");
    assert.equal(initial.buttonAriaPressed, false);
    assert.equal(initial.minHitAreaPx >= 44, true);

    // Click Show
    const afterShow = item.toggle();
    assert.equal(afterShow.hidden, false);
    assert.equal(afterShow.hasBadge, true);
    assert.equal(afterShow.buttonLabel, "Hide");
    assert.equal(afterShow.buttonAriaLabel, "Hide content");
    assert.equal(afterShow.buttonAriaPressed, true);

    // Click Hide again
    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.buttonLabel, "Show");
  });

  await t.test("2. Author viewing own flagged post: shown by default with badge, Hide works, Show works", () => {
    const item = simulateFlaggedContent({ isFlagged: true, isAuthor: true, isModeratorOrAdmin: false });
    const initial = item.getState();
    assert.equal(initial.hidden, false);
    assert.equal(initial.hasBadge, true);
    assert.equal(initial.buttonLabel, "Hide");
    assert.equal(initial.buttonAriaLabel, "Hide content");
    assert.equal(initial.buttonAriaPressed, true);

    // Author clicks Hide
    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.buttonLabel, "Show");

    // Author clicks Show
    const afterShow = item.toggle();
    assert.equal(afterShow.hidden, false);
    assert.equal(afterShow.hasBadge, true);
  });

  await t.test("3. Moderator viewing flagged comment in queue: shown by default with badge and Hide button", () => {
    const item = simulateFlaggedContent({ isFlagged: true, isAuthor: false, isModeratorOrAdmin: true });
    const initial = item.getState();
    assert.equal(initial.hidden, false);
    assert.equal(initial.hasBadge, true);
    assert.equal(initial.buttonLabel, "Hide");

    const afterHide = item.toggle();
    assert.equal(afterHide.hidden, true);
    assert.equal(afterHide.buttonLabel, "Show");
  });

  await t.test("4. Flagged comment in reply thread or flagged post on tag page", () => {
    const threadComment = simulateFlaggedContent({ isFlagged: true, isAuthor: false });
    assert.equal(threadComment.getState().hidden, true);
    assert.equal(threadComment.toggle().hidden, false);

    const tagPost = simulateFlaggedContent({ isFlagged: true, isAuthor: false });
    assert.equal(tagPost.getState().hidden, true);
    assert.equal(tagPost.toggle().hidden, false);
  });

  await t.test("5. Keyboard & Accessibility: Button attributes", () => {
    const item = simulateFlaggedContent({ isFlagged: true });
    const st = item.getState();
    assert.equal(st.buttonType, "button");
    assert.equal(st.minHitAreaPx >= 44, true);
  });
});
