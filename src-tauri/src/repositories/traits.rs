use super::{custom_err, Repository};
use crate::models::{Trait, TraitRelation};
use rusqlite::{params, Connection, Result};
use std::collections::{HashMap, HashSet, VecDeque};
use uuid::Uuid;

impl Repository {
    pub fn get_traits(
        conn: &Connection,
        life_id: &str,
        include_archived: bool,
    ) -> Result<Vec<Trait>> {
        let sql = if include_archived {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE life_id = ?1 ORDER BY created_at ASC"
        } else {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE life_id = ?1 AND archived_at IS NULL ORDER BY created_at ASC"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Trait {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                equip_state: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_trait(
        conn: &Connection,
        life_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
    ) -> Result<Trait> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO trait (id, life_id, title, body_md, icon, equip_state, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'unequipped', ?6, ?6)",
            params![id, life_id, title, body_md, icon, now],
        )?;
        Ok(Trait {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            equip_state: Some("unequipped".to_string()),
            archived_at: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_trait(
        conn: &Connection,
        life_id: &str,
        trait_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
    ) -> Result<Trait> {
        let now = chrono::Utc::now().to_rfc3339();
        let affected = conn.execute(
            "UPDATE trait SET title = ?1, body_md = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5 AND life_id = ?6",
            params![title, body_md, icon, now, trait_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("特质不存在或不属于当前人生世界"));
        }
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE id = ?1 AND life_id = ?2",
        )?;
        let mut rows = stmt.query_map([trait_id, life_id], |row| {
            Ok(Trait {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                equip_state: row.get(7)?,
            })
        })?;
        match rows.next() {
            Some(res) => res,
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn set_active_trait_stage(
        conn: &mut Connection,
        life_id: &str,
        group_trait_ids: &[String],
        active_trait_id: &str,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let tx = conn.transaction()?;
        for tid in group_trait_ids {
            let equip_state = if tid == active_trait_id {
                "active"
            } else {
                "unequipped"
            };
            // 纯更新 equip_state，决不允许覆盖或清空 icon 视觉图标！
            let affected = tx.execute(
                "UPDATE trait SET equip_state = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
                params![equip_state, now, tid, life_id],
            )?;
            if affected == 0 {
                return Err(custom_err("特质不存在或不属于当前人生世界"));
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn set_trait_equipped(
        conn: &mut Connection,
        life_id: &str,
        trait_ids: &[String],
        equip: bool,
        target_active_id: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let tx = conn.transaction()?;
        if !equip {
            for tid in trait_ids {
                // 待命下阵：纯更新 equip_state = 'benched'，决不允许覆盖或清空 icon！
                let affected = tx.execute(
                    "UPDATE trait SET equip_state = 'benched', updated_at = ?1 WHERE id = ?2 AND life_id = ?3",
                    params![now, tid, life_id],
                )?;
                if affected == 0 {
                    return Err(custom_err("特质不存在或不属于当前人生世界"));
                }
            }
        } else {
            let active_id = target_active_id
                .map(|s| s.to_string())
                .or_else(|| trait_ids.first().cloned())
                .unwrap_or_default();
            for tid in trait_ids {
                let equip_state = if tid == &active_id {
                    "active"
                } else {
                    "unequipped"
                };
                // 重新激活上阵：纯更新 equip_state，决不碰触 icon！
                let affected = tx.execute(
                    "UPDATE trait SET equip_state = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
                    params![equip_state, now, tid, life_id],
                )?;
                if affected == 0 {
                    return Err(custom_err("特质不存在或不属于当前人生世界"));
                }
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn resolve_active_equipped_traits(
        traits: &[Trait],
        relations: &[TraitRelation],
    ) -> Vec<Trait> {
        if traits.is_empty() {
            return Vec::new();
        }

        let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
        for r in relations {
            adj.entry(&r.predecessor_id)
                .or_default()
                .push(&r.successor_id);
            adj.entry(&r.successor_id)
                .or_default()
                .push(&r.predecessor_id);
        }

        let trait_map: HashMap<&str, &Trait> = traits.iter().map(|t| (t.id.as_str(), t)).collect();
        let mut visited: HashSet<&str> = HashSet::new();
        let mut active_traits: Vec<Trait> = Vec::new();

        for t in traits {
            if visited.contains(t.id.as_str()) {
                continue;
            }

            let mut component_ids: Vec<&str> = Vec::new();
            let mut queue = VecDeque::new();
            queue.push_back(t.id.as_str());
            visited.insert(t.id.as_str());

            while let Some(curr_id) = queue.pop_front() {
                component_ids.push(curr_id);
                if let Some(neighbors) = adj.get(curr_id) {
                    for &neighbor in neighbors {
                        if trait_map.contains_key(neighbor) && !visited.contains(neighbor) {
                            visited.insert(neighbor);
                            queue.push_back(neighbor);
                        }
                    }
                }
            }

            let component_traits: Vec<&Trait> = component_ids
                .into_iter()
                .filter_map(|id| trait_map.get(id).copied())
                .collect();

            if component_traits.is_empty() {
                continue;
            }

            let is_benched = |t: &Trait| -> bool { t.equip_state.as_deref() == Some("benched") };
            let is_active = |t: &Trait| -> bool { t.equip_state.as_deref() == Some("active") };

            if component_traits.len() == 1 {
                let single = component_traits[0];
                if !is_benched(single) {
                    active_traits.push(single.clone());
                }
            } else {
                if let Some(act) = component_traits.iter().find(|item| is_active(item)) {
                    active_traits.push((*act).clone());
                } else {
                    let has_benched = component_traits.iter().any(|item| is_benched(item));
                    if !has_benched {
                        let successors: HashSet<&str> =
                            relations.iter().map(|r| r.successor_id.as_str()).collect();
                        let root_trait = component_traits
                            .iter()
                            .find(|item| !successors.contains(item.id.as_str()))
                            .copied()
                            .unwrap_or(component_traits[0]);
                        active_traits.push(root_trait.clone());
                    }
                }
            }
        }

        active_traits
    }

    pub fn archive_trait(
        conn: &Connection,
        life_id: &str,
        trait_id: &str,
        archive: bool,
    ) -> Result<()> {
        let now = if archive {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };
        let affected = conn.execute(
            "UPDATE trait SET archived_at = ?1 WHERE id = ?2 AND life_id = ?3",
            params![now, trait_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("特质不存在或不属于当前人生世界"));
        }
        Ok(())
    }

    pub fn delete_trait(conn: &mut Connection, life_id: &str, trait_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        tx.execute(
            "DELETE FROM trait_relation WHERE life_id = ?1 AND (predecessor_id = ?2 OR successor_id = ?2)",
            params![life_id, trait_id],
        )?;
        let affected = tx.execute(
            "DELETE FROM trait WHERE id = ?1 AND life_id = ?2",
            params![trait_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("特质不存在或不属于当前人生世界"));
        }
        tx.commit()?;
        Ok(())
    }

    pub fn get_trait_relations(conn: &Connection, life_id: &str) -> Result<Vec<TraitRelation>> {
        let mut stmt = conn.prepare(
            "SELECT id, predecessor_id, successor_id, occurred_at, note FROM trait_relation WHERE life_id = ?1",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(TraitRelation {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                predecessor_id: row.get(1)?,
                successor_id: row.get(2)?,
                occurred_at: row.get(3)?,
                note: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_trait_relation(
        conn: &Connection,
        life_id: &str,
        pred_id: &str,
        succ_id: &str,
        note: Option<&str>,
    ) -> Result<TraitRelation> {
        if pred_id == succ_id {
            return Err(custom_err(
                "Trait relation cannot connect a trait to itself",
            ));
        }

        let valid: bool = conn.query_row(
            "SELECT (SELECT COUNT(*) FROM trait WHERE id = ?1 AND life_id = ?3) = 1 AND (SELECT COUNT(*) FROM trait WHERE id = ?2 AND life_id = ?3) = 1",
            params![pred_id, succ_id, life_id],
            |row| row.get(0),
        )?;
        if !valid {
            return Err(custom_err(
                "Predecessor and successor traits must belong to the specified life_id",
            ));
        }

        // DAG cycle detection
        let mut visited = std::collections::HashSet::new();
        let mut queue = std::collections::VecDeque::new();
        queue.push_back(succ_id.to_string());
        visited.insert(succ_id.to_string());

        let mut stmt = conn.prepare(
            "SELECT successor_id FROM trait_relation WHERE life_id = ?1 AND predecessor_id = ?2",
        )?;

        let mut has_cycle = false;
        while let Some(curr) = queue.pop_front() {
            if curr == pred_id {
                has_cycle = true;
                break;
            }
            let next_nodes = stmt.query_map(params![life_id, curr], |r| r.get::<_, String>(0))?;
            for next in next_nodes {
                let n = next?;
                if !visited.contains(&n) {
                    visited.insert(n.clone());
                    queue.push_back(n);
                }
            }
        }

        if has_cycle {
            return Err(custom_err(
                "Cannot add trait relation: would create a circular dependency cycle",
            ));
        }

        let existing: Option<String> = conn.query_row(
            "SELECT id FROM trait_relation WHERE life_id = ?1 AND predecessor_id = ?2 AND successor_id = ?3",
            params![life_id, pred_id, succ_id],
            |row| row.get(0),
        ).ok();
        if let Some(existing_id) = existing {
            return Ok(TraitRelation {
                id: existing_id,
                life_id: life_id.to_string(),
                predecessor_id: pred_id.to_string(),
                successor_id: succ_id.to_string(),
                occurred_at: chrono::Utc::now().to_rfc3339(),
                note: note.map(String::from),
            });
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO trait_relation (id, life_id, predecessor_id, successor_id, occurred_at, note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, life_id, pred_id, succ_id, now, note],
        )?;
        Ok(TraitRelation {
            id,
            life_id: life_id.to_string(),
            predecessor_id: pred_id.to_string(),
            successor_id: succ_id.to_string(),
            occurred_at: now,
            note: note.map(String::from),
        })
    }

    pub fn delete_trait_relation(
        conn: &Connection,
        life_id: &str,
        relation_id: &str,
    ) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM trait_relation WHERE id = ?1 AND life_id = ?2",
            params![relation_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("特质演化关系不存在或不属于当前人生世界"));
        }
        Ok(())
    }

    pub fn delete_trait_relation_by_nodes(
        conn: &Connection,
        life_id: &str,
        pred_id: &str,
        succ_id: &str,
    ) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM trait_relation WHERE predecessor_id = ?1 AND successor_id = ?2 AND life_id = ?3",
            params![pred_id, succ_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("特质演化关系不存在或不属于当前人生世界"));
        }
        Ok(())
    }
}
