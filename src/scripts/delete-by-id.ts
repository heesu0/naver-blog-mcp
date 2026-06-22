import { deletePostById } from '../services/deleter.js';

const postId = Number(process.argv[2]);
if (!postId) {
  console.error('Usage: tsx src/scripts/delete-by-id.ts <postId>');
  process.exit(1);
}

const result = await deletePostById(postId, { deleteOnNaver: true });
console.log(JSON.stringify(result, null, 2));
