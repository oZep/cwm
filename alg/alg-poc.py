from dataclasses import dataclass

text = '''
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec maximus rutrum tellus, eget finibus urna cursus eu. Cras sed est et nisi dapibus placerat. Morbi molestie pulvinar velit, non accumsan nunc. Sed maximus orci ut enim euismod, sed sodales lectus interdum. Etiam enim sapien, malesuada maximus ultrices a, vulputate quis ligula. Aenean pulvinar sapien vel nisl pellentesque, vitae luctus massa tristique. Suspendisse ac egestas augue. Nam nec diam iaculis, dignissim massa at, malesuada turpis.
'''

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
updates.append(Update(hash(text), Diff('remove', '', 20)))
updates.append(Update(hash(updates[0]), Diff('remove', '', 12)))

# texts = {
#     hash(text): text,
# }

done = False
while not done:
  done = True
  for i in range(len(updates)):
    for j in range(i + 1, len(updates)):
      if updates[i].hash == updates[j].hash:
        u = i if updates[i].diff < updates[j].diff else j
        v = j if updates[i].diff < updates[j].diff else i
        match updates[v].diff, updates[u].diff:
          case Diff('remove' | 'append', _, _), Diff('remove', _, _):
            updates[v].hash = hash(updates[u])
            updates[v].diff.idx -= updates[v].diff.idx > updates[u].diff.idx
          case Diff('remove' | 'append', _, _), Diff('append', _, _):
            updates[v].hash = hash(updates[u])
            updates[v].diff.idx += updates[v].diff.idx > updates[u].diff.idx
        done = False

curr_hash = hash(text)
done = False
while not done:
  done = True
  for i in range(len(updates)):
    if updates[i].hash == curr_hash:
      print(updates[i].diff)
      curr_hash = hash(updates[i])
      done = False
      break
