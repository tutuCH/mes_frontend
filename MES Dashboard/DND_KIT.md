# @dnd-kit (next) — practical notes + copy/paste snippets (Vanilla DOM)

> Based on the “next” docs you linked: Quickstart, DragDropManager, Draggable, Droppable, Sortable. ([Dnd Kit][1])

---

## 1) Install

```bash
npm install @dnd-kit/dom
```

([Dnd Kit][1])

---

## 2) Create a DragDropManager (the orchestrator)

The manager coordinates sensors, plugins, modifiers, event monitoring, and registration. ([Dnd Kit][2])

### Minimal manager

```ts
import {DragDropManager} from '@dnd-kit/dom';

const manager = new DragDropManager();
```

([Dnd Kit][2])

### Manager with sensors / plugins / modifiers

```ts
import {
  DragDropManager,
  KeyboardSensor,
  PointerSensor,
} from '@dnd-kit/dom';

// Note: plugins/modifiers like AutoScroller, Accessibility, restrictToWindow
// are referenced by the docs and may require importing from their respective modules/packages.
const manager = new DragDropManager({
  sensors: [PointerSensor, KeyboardSensor],
  plugins: [
    AutoScroller,
    Accessibility,
  ],
  modifiers: [
    restrictToWindow,
  ],
});
```

([Dnd Kit][2])

### Listen to drag lifecycle events (monitor)

```ts
manager.monitor.addEventListener('beforedragstart', (event) => {
  // Optionally prevent dragging
  // event.preventDefault();
});

manager.monitor.addEventListener('dragmove', (event) => {
  const {source, position} = event.operation;
  console.log(`Dragging ${source.id} to`, position.current);
});

manager.monitor.addEventListener('collision', (event) => {
  const [first] = event.collisions;
  if (first) console.log('Colliding with:', first.id);
});

manager.monitor.addEventListener('dragend', (event) => {
  const {source, target, canceled} = event.operation;
  if (!canceled && target) console.log(`Dropped ${source.id} onto ${target.id}`);
});
```

([Dnd Kit][2])

---

## 3) Draggable (make an element draggable)

Draggable supports: `id`, `element`, optional `handle`, optional `type`, `feedback`, etc. ([Dnd Kit][1])

### Basic draggable

```ts
import {DragDropManager, Draggable} from '@dnd-kit/dom';

const manager = new DragDropManager();

const el = document.querySelector('#drag-me')!;
const draggable = new Draggable(
  { id: 'draggable-1', element: el },
  manager
);
```

([Dnd Kit][1])

### Draggable with a handle

```ts
const element = document.createElement('div');
const handle = document.createElement('div');
handle.classList.add('handle');
handle.innerHTML = '⋮';

element.appendChild(handle);

const draggable = new Draggable(
  { id: 'draggable-1', element, handle },
  manager
);
```

([Dnd Kit][3])

### Draggable “types” (for drop filtering)

```ts
const draggable = new Draggable(
  {
    id: 'draggable-1',
    element,
    type: 'item',
  },
  manager
);
```

([Dnd Kit][3])

### Drag feedback modes

```ts
const draggable = new Draggable(
  {
    id: 'draggable-1',
    element,
    feedback: 'clone', // 'default' | 'clone' | 'move' | 'none'
  },
  manager
);
```

([Dnd Kit][3])

---

## 4) Droppable (create a drop target)

Droppable supports: `id`, `element`, optional `accepts`, collision detector options, and collision priority. ([Dnd Kit][1])

### Basic droppable + detect a drop

```ts
import {Droppable, DragDropManager} from '@dnd-kit/dom';

const manager = new DragDropManager();

const element = document.createElement('div');
element.classList.add('droppable');

// Create a droppable target
const droppable = new Droppable(
  { id: 'drop-zone', element },
  manager
);

document.body.appendChild(element);

// Listen for drop events
manager.monitor.addEventListener('dragend', (event) => {
  if (event.operation.target?.id === droppable.id) {
    console.log('Item dropped!', event.operation.source);
  }
});
```

([Dnd Kit][4])

### Accept only certain draggable types

```ts
// single type
const droppable1 = new Droppable(
  { id: 'drop-zone', element, accepts: 'item' },
  manager
);

// multiple types
const droppable2 = new Droppable(
  { id: 'drop-zone-2', element: element2, accepts: ['item', 'card'] },
  manager
);

// function-based acceptance
const droppable3 = new Droppable(
  {
    id: 'fruits-only',
    element: element3,
    accepts: (draggable) => draggable.type === 'item' && draggable.data.category === 'fruit',
  },
  manager
);
```

([Dnd Kit][4])

### Customize collision detection

```ts
import {
  closestCenter,
  pointerIntersection,
  directionBiased,
} from '@dnd-kit/collision';

const droppable = new Droppable(
  {
    id: 'card-stack',
    element,
    collisionDetector: closestCenter,
  },
  manager
);
```

([Dnd Kit][4])

### Collision priority (nested droppables)

```ts
const container = new Droppable(
  {
    id: 'container',
    element: containerElement,
    collisionPriority: 1,
  },
  manager
);

const item = new Droppable(
  {
    id: 'item',
    element: itemElement,
    collisionPriority: 2,
  },
  manager
);
```

([Dnd Kit][4])

---

## 5) Quickstart-style “move DOM node into drop zone on drop”

The Quickstart describes monitoring drag events and updating the DOM accordingly. ([Dnd Kit][1])

Here’s a clean, practical pattern:

```ts
import {DragDropManager, Draggable, Droppable} from '@dnd-kit/dom';

const manager = new DragDropManager();

const dragEl = document.querySelector('#drag-me')!;
const dropEl = document.querySelector('#drop-here')!;

const draggable = new Draggable({id: 'drag-1', element: dragEl, type: 'item'}, manager);
const droppable = new Droppable({id: 'drop-1', element: dropEl, accepts: 'item'}, manager);

manager.monitor.addEventListener('dragend', (event) => {
  const {source, target, canceled} = event.operation;
  if (canceled) return;

  // Only move if dropped on our target
  if (target?.id === droppable.id && source.id === draggable.id) {
    dropEl.appendChild(dragEl);
  }
});
```

([Dnd Kit][1])

---

## 6) Sortable (reorder within a list / across lists)

Sortable items are both Draggable and Droppable; supports grouping (multiple lists), handles, and transitions. ([Dnd Kit][5])

### Multiple lists via `group`

```ts
import {DragDropManager, Sortable} from '@dnd-kit/dom';

const manager = new DragDropManager();

const list1 = ['Item 1', 'Item 2'];
const list2 = ['Item 3', 'Item 4'];

function createItemElement(label: string) {
  const el = document.createElement('li');
  el.textContent = label;
  return el;
}

list1.forEach((item, index) => {
  new Sortable(
    {
      id: item,
      index,
      group: 'list1',
      element: createItemElement(item),
    },
    manager
  );
});

list2.forEach((item, index) => {
  new Sortable(
    {
      id: item,
      index,
      group: 'list2',
      element: createItemElement(item),
    },
    manager
  );
});
```

([Dnd Kit][5])

### Sortable with a drag handle

```ts
const element = document.createElement('li');
const handle = document.createElement('div');
handle.classList.add('handle');
element.appendChild(handle);

new Sortable(
  { id: 'item-1', index: 0, element, handle },
  manager
);
```

([Dnd Kit][5])

### Sortable animation tuning (`transition`)

```ts
new Sortable(
  {
    id: 'item-1',
    index: 0,
    element,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      idle: false,
    },
  },
  manager
);
```

([Dnd Kit][5])

---

## 7) Practical mental model (how the pieces fit)

* **DragDropManager**: the “runtime” + event bus (`monitor`) + registration/coordination. ([Dnd Kit][2])
* **Draggable**: declares *what can be dragged* (optionally typed, handled, with feedback modes). ([Dnd Kit][3])
* **Droppable**: declares *where you can drop* (optionally accepts types, collision detection, priority). ([Dnd Kit][4])
* **Sortable**: a higher-level primitive for list reordering (draggable + droppable + list semantics). ([Dnd Kit][5])


[1]: https://next.dndkit.com/quickstart "Quickstart - @dnd-kit"
[2]: https://next.dndkit.com/concepts/drag-drop-manager "DragDropManager - @dnd-kit"
[3]: https://next.dndkit.com/concepts/draggable "Draggable - @dnd-kit"
[4]: https://next.dndkit.com/concepts/droppable "Droppable - @dnd-kit"
[5]: https://next.dndkit.com/concepts/sortable "Sortable - @dnd-kit"
