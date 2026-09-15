use super::Repository;
use crate::models::{StaffMeeting, StaffMember};
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

impl Repository {
    pub fn get_staff_members(conn: &Connection, life_id: &str) -> Result<Vec<StaffMember>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at
             FROM staff_member
             WHERE life_id = ?1
             ORDER BY sort_order ASC, created_at ASC",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            Ok(StaffMember {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                name: row.get(2)?,
                role: row.get(3)?,
                prompt: row.get(4)?,
                provider_config_id: row.get(5)?,
                model: row.get(6)?,
                enabled: row.get::<_, i64>(7)? != 0,
                sort_order: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let members: Vec<StaffMember> = rows.collect::<Result<Vec<_>>>()?;

        if members.is_empty() {
            Self::init_default_staff_members(conn, life_id)
        } else {
            Ok(members)
        }
    }

    pub fn init_default_staff_members(
        conn: &Connection,
        life_id: &str,
    ) -> Result<Vec<StaffMember>> {
        let defaults = [
            ("战略参谋长", "首席长期战略顾问", "从宏观战略、路线演进与终局思维出发，推演各项重大国策的长远得失与可行节奏，拒绝短期短视。"),
            ("财政与资源总监", "财务与精力分配顾问", "关注时间、精力与财务资本的分配效率，严格计算投入产出比，防止盲目扩张导致的财政或能量透支。"),
            ("身心体魄总管", "精力管理与健康顾问", "关注最高统帅的精力槽、睡眠与精神状态，在面临高压决策时警惕身心耗竭，确保战略持续力。"),
            ("批判反对者", "战略挑刺官与盲区副官", "专门寻找计划中的逻辑漏洞、未预料的意外风险与自我欺骗，提出尖锐的反向质询。"),
            ("哲学与意识形态宗师", "底层价值观与定力导师", "从核心人生哲学与伦理信念出发，评估行动是否背离初心，确保战略与自我认知高度统一。"),
        ];

        let now = chrono::Utc::now().to_rfc3339();
        let mut created = Vec::new();
        for (i, (name, role, prompt)) in defaults.iter().enumerate() {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO staff_member (id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, 1, ?6, ?7, ?7)",
                params![id, life_id, name, role, prompt, i as i32, now],
            )?;
            created.push(StaffMember {
                id,
                life_id: life_id.to_string(),
                name: name.to_string(),
                role: role.to_string(),
                prompt: prompt.to_string(),
                provider_config_id: None,
                model: None,
                enabled: true,
                sort_order: i as i32,
                created_at: now.clone(),
                updated_at: now.clone(),
            });
        }
        Ok(created)
    }

    pub fn create_staff_member(
        conn: &Connection,
        life_id: &str,
        name: &str,
        role: &str,
        prompt: &str,
        model: Option<&str>,
    ) -> Result<StaffMember> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM staff_member WHERE life_id = ?1",
                params![life_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO staff_member (id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, 1, ?7, ?8, ?8)",
            params![id, life_id, name, role, prompt, model, sort_order, now],
        )?;

        Ok(StaffMember {
            id,
            life_id: life_id.to_string(),
            name: name.to_string(),
            role: role.to_string(),
            prompt: prompt.to_string(),
            provider_config_id: None,
            model: model.map(String::from),
            enabled: true,
            sort_order,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_staff_member(
        conn: &Connection,
        life_id: &str,
        member_id: &str,
        name: &str,
        role: &str,
        prompt: &str,
        enabled: bool,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let affected = conn.execute(
            "UPDATE staff_member SET name = ?1, role = ?2, prompt = ?3, enabled = ?4, updated_at = ?5
             WHERE id = ?6 AND life_id = ?7",
            params![name, role, prompt, if enabled { 1 } else { 0 }, now, member_id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn delete_staff_member(conn: &Connection, life_id: &str, member_id: &str) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM staff_member WHERE id = ?1 AND life_id = ?2",
            params![member_id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn get_staff_meetings(conn: &Connection, life_id: &str) -> Result<Vec<StaffMeeting>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, status, created_at
             FROM staff_meeting
             WHERE life_id = ?1
             ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            Ok(StaffMeeting {
                id: row.get(0)?,
                life_id: row.get(1)?,
                topic: row.get(2)?,
                confirmed_minutes_md: row.get(3)?,
                context_module_names: row.get(4)?,
                rounds: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_staff_meeting(
        conn: &mut Connection,
        life_id: &str,
        topic: &str,
        confirmed_minutes_md: &str,
        context_module_names: &str,
        rounds: i32,
        messages: Vec<(String, i32, String)>,
    ) -> Result<StaffMeeting> {
        let meeting_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO staff_meeting (id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'completed', ?7)",
            params![meeting_id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, now],
        )?;

        for (speaker, r_idx, content) in messages {
            let msg_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO staff_message (id, life_id, meeting_id, speaker_label, round_index, confirmed_content, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![msg_id, life_id, meeting_id, speaker, r_idx, content, now],
            )?;
        }

        tx.commit()?;

        Ok(StaffMeeting {
            id: meeting_id,
            life_id: life_id.to_string(),
            topic: topic.to_string(),
            confirmed_minutes_md: Some(confirmed_minutes_md.to_string()),
            context_module_names: context_module_names.to_string(),
            rounds,
            status: "completed".to_string(),
            created_at: now,
        })
    }
}
