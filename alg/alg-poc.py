from dataclasses import dataclass

text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'


@dataclass(order=True, unsafe_hash=True)
class Update:
  hash: object
  diff: object


@dataclass(order=True, unsafe_hash=True)
class Diff:
  op: object
  chr: object
  idx: object


updates = []
updates.append(Update(hash(text), Diff('append', 'a', 10)))
updates.append(Update(hash(text), Diff('append', 'b', 25)))
updates.append(Update(hash(updates[0]), Diff('remove', '', 12)))
updates.append(Update(hash(text), Diff('remove', '', 20)))
updates.append(Update(hash(updates[0]), Diff('append', 'c', 20)))

print('INITIAL TEXT STATE')
print(text)

print('UPDATES (unordered modifications to text states)')
for update in updates:
  print('  -', update, hash(update))


class Continue(Exception):
  pass


def advance(from_hash, to_hash, diff, updates):
  for u in range(len(updates)):
    if updates[u] is None:
      continue
    if updates[u].hash != from_hash:
      continue

    from_hash_2 = hash(updates[u])

    match diff, updates[u].diff:
      case Diff('remove', _, d_idx), Diff('remove' | 'append', _, u_idx):
        updates[u].diff.idx -= u_idx > d_idx
      case Diff('append', _, d_idx), Diff('remove' | 'append', _, u_idx):
        updates[u].diff.idx += u_idx > d_idx
    updates[u].hash = to_hash

    to_hash_2 = hash(updates[u])

    advance(from_hash_2, to_hash_2, diff, updates)


while True:
  try:
    for i in range(len(updates)):
      for j in range(i + 1, len(updates)):
        if updates[i].hash != updates[j].hash:
          continue
        u = i if updates[i].diff < updates[j].diff else j
        update, updates[u] = updates[u], None
        advance(update.hash, hash(update), update.diff, updates)
        updates[u] = update
        raise Continue
    break
  except Continue:
    pass


def apply(diff, text):
  match diff:
    case Diff('append', chr, idx):
      text = text[:idx] + chr + text[idx:]
    case Diff('remove', _, idx):
      text = text[:idx] + text[idx + 1:]
  return text


diffs = []

curr_hash = hash(text)
while True:
  for update in updates:
    if update.hash == curr_hash:
      diffs.append(update.diff)
      curr_hash = hash(update)
      break
  else:
    break

for diff in diffs:
  text = apply(diff, text)

print('DIFFS (ordered modifications to be applied)')
for diff in diffs:
  print('  -', diff)

print('FINAL TEXT STATE')
print(text)
