import type { Repository } from "@/src/lib/repo/types";
import { FirestoreRepo } from "@/src/lib/repo/firestore";
import { MemoryRepo } from "@/src/lib/repo/memory";

let repository: Repository | undefined;

export function getRepository(): Repository {
  if (!repository) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    repository = projectId && process.env.USE_MEMORY_DB !== "true"
      ? new FirestoreRepo(projectId)
      : new MemoryRepo();
  }
  return repository;
}

export function setRepositoryForTests(value: Repository | undefined): void {
  repository = value;
}
