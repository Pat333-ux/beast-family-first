'use strict';

const dimensions = [
  ['housing', 'Housing stability', 15],
  ['food', 'Food security', 10],
  ['employment', 'Employment', 20],
  ['mentalHealth', 'Mental health support', 20],
  ['householdStress', 'Household stress', 15],
  ['childWellbeing', 'Child wellbeing', 20]
];

const needs = [
  ['housing', 'Housing'],
  ['food', 'Food'],
  ['utilities', 'Utilities'],
  ['employment', 'Employment'],
  ['mentalHealth', 'Mental health'],
  ['householdStress', 'Household stress'],
  ['childWellbeing', 'Child wellbeing']
];

const scoreFields = document.querySelector('#score-fields');
const needOptions = document.querySelector('#need-options');
const intakeForm = document.querySelector('#intake-form');
const caseList = document.querySelector('#case-list');
const queueEmpty = document.querySelector('#queue-empty');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

dimensions.forEach(([key, label, weight]) => {
  const wrapper = element('label', 'score-field');
  const title = element('span', 'score-label', label);
  const weightNote = element('span', 'weight', `${weight}%`);
  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.value = '50';
  range.name = key;
  range.setAttribute('aria-label', `${label}, stability from 0 to 100`);
  const value = element('output', 'range-value', '50');
  range.addEventListener('input', () => { value.value = range.value; });
  const top = element('span', 'score-topline');
  top.append(title, weightNote);
  wrapper.append(top, range, value);
  scoreFields.append(wrapper);
});

needs.forEach(([key, label]) => {
  const wrapper = element('label', 'need-option');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'need';
  checkbox.value = key;
  wrapper.append(checkbox, element('span', '', label));
  needOptions.append(wrapper);
});

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

function renderReviewForm(record, container) {
  const form = element('form', 'review-form');
  const reviewerLabel = element('label', 'review-input', 'Reviewer ID');
  const reviewer = document.createElement('input');
  reviewer.required = true;
  reviewer.maxLength = 120;
  reviewer.autocomplete = 'off';
  reviewerLabel.append(reviewer);

  const notesLabel = element('label', 'review-input', 'Review notes (demo only)');
  const notes = document.createElement('textarea');
  notes.required = true;
  notes.maxLength = 2000;
  notes.rows = 2;
  notesLabel.append(notes);

  const actions = element('div', 'review-actions');
  for (const decision of ['approved', 'declined']) {
    const button = element('button', decision === 'approved' ? 'button review-approve' : 'button review-decline', decision === 'approved' ? 'Approve suggested next steps' : 'Decline');
    button.type = 'submit';
    button.value = decision;
    actions.append(button);
  }
  const status = element('p', 'message');
  status.setAttribute('role', 'status');
  form.append(reviewerLabel, notesLabel, actions, status);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const decision = event.submitter.value;
    actions.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    try {
      await requestJson(`/api/cases/${encodeURIComponent(record.id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewer: reviewer.value, notes: notes.value })
      });
      await loadCases();
    } catch (error) {
      status.textContent = error.message;
      actions.querySelectorAll('button').forEach((button) => { button.disabled = false; });
    }
  });
  return form;
}

function renderCase(record) {
  const card = element('article', 'case-card');
  const heading = element('div', 'case-heading');
  const title = element('h3', '', `Demo case ${record.id.slice(0, 8)}`);
  const status = element('span', `status status-${record.status}`, record.status.replace('_', ' '));
  heading.append(title, status);

  const score = element('div', 'assessment-summary');
  score.append(
    element('strong', 'stability-score', `${record.assessment.score}<small>/100</small>`),
    element('span', '', record.assessment.priority)
  );

  const dimensionsList = element('ul', 'dimension-list');
  for (const dimension of Object.values(record.assessment.dimensions)) {
    const item = element('li');
    item.append(element('span', '', dimension.label), element('span', 'dimension-value', `${dimension.value} · ${dimension.weight}%`));
    dimensionsList.append(item);
  }

  const resources = element('div', 'resource-list');
  resources.append(element('h4', '', 'Resources to discuss'));
  if (record.resources.length === 0) {
    resources.append(element('p', 'muted', 'No categories selected; ask the family what support would be useful.'));
  } else {
    const list = element('ul');
    record.resources.forEach(({ resource }) => list.append(element('li', '', resource)));
    resources.append(list);
  }

  card.append(heading, score, dimensionsList, resources);
  if (record.review) {
    card.append(element('p', 'review-record', `${record.review.decision} by ${record.review.reviewer} · ${record.review.reviewedAt}`));
  } else {
    card.append(renderReviewForm(record, card));
  }
  return card;
}

async function loadCases() {
  try {
    const { cases } = await requestJson('/api/cases');
    caseList.replaceChildren(...cases.map(renderCase));
    queueEmpty.hidden = cases.length > 0;
    document.querySelector('#metric-total').textContent = String(cases.length);
    document.querySelector('#metric-pending').textContent = String(cases.filter((item) => item.status === 'pending_review').length);
    document.querySelector('#metric-reviewed').textContent = String(cases.filter((item) => item.status !== 'pending_review').length);
  } catch (error) {
    queueEmpty.textContent = `Unable to load demo cases: ${error.message}`;
    queueEmpty.hidden = false;
  }
}

intakeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = intakeForm.querySelector('button[type="submit"]');
  const message = document.querySelector('#intake-message');
  submitButton.disabled = true;
  message.textContent = 'Creating demo intake…';
  const scores = Object.fromEntries(dimensions.map(([key]) => [
    key,
    Number(intakeForm.elements.namedItem(key).value)
  ]));
  const selectedNeeds = [...intakeForm.querySelectorAll('input[name="need"]:checked')].map((input) => input.value);
  try {
    await requestJson('/api/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, needs: selectedNeeds })
    });
    message.textContent = 'Intake created. It is awaiting human review.';
    await loadCases();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadCases();
