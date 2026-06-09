// SPDX-FileCopyrightText: 2026 Mark Percival, John Schult
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineConfig } from 'vitest/config';
import { webProjects } from './vitest.projects';

export default defineConfig({ test: { projects: webProjects } });
