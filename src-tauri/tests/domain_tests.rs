use app_lib::db::DbState;
use app_lib::repositories::Repository;

#[test]
fn test_migrations_and_life_isolation() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();

    // 1. 创建两个独立的人生世界 Life A 与 Life B
    let life_a = Repository::create_life(&mut conn, "人生A · 学术路线").expect("failed to create life A");
    let life_b = Repository::create_life(&mut conn, "人生B · 商业创业").expect("failed to create life B");

    assert_ne!(life_a.id, life_b.id);

    // 2. 在 Life A 创建国策与决议
    let focus_a = Repository::create_focus(
        &mut conn,
        &life_a.id,
        "完成博士论文",
        "投入全力攻克论文研究",
        None,
        None,
        "active",
        100.0,
        200.0,
    )
    .expect("failed to create focus in life A");

    // 3. 在 Life B 创建国策
    let focus_b = Repository::create_focus(
        &mut conn,
        &life_b.id,
        "完成种子轮融资",
        "与 10 家机构接洽",
        None,
        None,
        "active",
        300.0,
        400.0,
    )
    .expect("failed to create focus in life B");

    // 4. 验证 Life A 与 Life B 数据严格隔离 (A01)
    let foci_a = Repository::get_foci(&conn, &life_a.id).unwrap();
    let foci_b = Repository::get_foci(&conn, &life_b.id).unwrap();
    assert_eq!(foci_a.len(), 1);
    assert_eq!(foci_a[0].id, focus_a.id);
    assert_eq!(foci_b.len(), 1);
    assert_eq!(foci_b[0].id, focus_b.id);
}

#[test]
fn test_stability_arbitrary_value_and_history() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "稳定度测试空间").unwrap();

    // 初始稳定度为 None (A09 / §6.5)
    let init_stab = Repository::get_stability(&conn, &life.id).unwrap();
    assert_eq!(init_stab.current_value, None);

    // 设置为超界数值 135
    let change1 = Repository::set_stability(&mut conn, &life.id, 135.0, Some("重大突破"), None, None).unwrap();
    assert_eq!(change1.before_value, None);
    assert_eq!(change1.after_value, 135.0);
    assert_eq!(change1.delta, None);

    // 设置为负数 -20
    let change2 = Repository::set_stability(&mut conn, &life.id, -20.0, Some("外在危机"), None, None).unwrap();
    assert_eq!(change2.before_value, Some(135.0));
    assert_eq!(change2.after_value, -20.0);
    assert_eq!(change2.delta, Some(-155.0));

    // 手动增减 +5 => -15
    let change3 = Repository::set_stability(&mut conn, &life.id, -15.0, Some("调整心态"), None, None).unwrap();
    assert_eq!(change3.before_value, Some(-20.0));
    assert_eq!(change3.after_value, -15.0);
    assert_eq!(change3.delta, Some(5.0));

    let history = Repository::get_stability_history(&conn, &life.id, 10).unwrap();
    assert_eq!(history.len(), 3);
}



#[test]
fn test_unified_archive_aggregation() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "档案测试").unwrap();

    // 插入普通事件与超事件
    Repository::create_event(
        &conn,
        &life.id,
        "收到第一份录取通知",
        "激动人心的一天",
        "normal",
        "2026-05-01",
        None,
        None,
        None,
    ).unwrap();

    Repository::create_event(
        &conn,
        &life.id,
        "新纪元启航",
        "重大转折发生",
        "super",
        "2026-06-01",
        None,
        Some("历史由此改变"),
        None,
    ).unwrap();

    // 插入随笔
    Repository::create_essay(&conn, &life.id, "关于战略重心的思考", "阶段性复盘...").unwrap();

    // 插入国策并改状态
    let focus = Repository::create_focus(
        &mut conn,
        &life.id,
        "长期战略",
        "说明",
        None,
        None,
        "active",
        0.0,
        0.0,
    ).unwrap();
    Repository::update_focus_status(&mut conn, &life.id, &focus.id, "completed", Some("阶段目标达成"), None, None).unwrap();

    // 验证 Archive 聚合查询 (A19 / §10: 无物理实体表，统一展示层按时间倒序)
    let feed = Repository::get_archive_feed(&conn, &life.id, None).unwrap();
    assert!(feed.len() >= 4);
    assert_eq!(feed[0].item_type, "focus_history"); // 刚才刚完成的国策发生时间最新
}

#[test]
fn test_focus_canvas_operations_and_relations() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "国策画布专属测试").unwrap();

    // 1. 创建两个国策节点 A 和 B
    let focus_a = Repository::create_focus(
        &mut conn,
        &life.id,
        "攻读人工智能方向",
        "深入掌握深度学习",
        None,
        None,
        "active",
        120.0,
        180.0,
    ).unwrap();

    let focus_b = Repository::create_focus(
        &mut conn,
        &life.id,
        "直接进入业界工程研发",
        "作为一线核心工程师",
        None,
        None,
        "paused",
        350.0,
        180.0,
    ).unwrap();

    // 2. 建立互斥关系 (A 与 B 互斥路线，§7.3)
    let rel_mutex = Repository::add_focus_relation(
        &conn,
        &life.id,
        &focus_a.id,
        &focus_b.id,
        "mutually_exclusive",
        Some("全日制深造与全职工作时间冲突"),
    ).unwrap();
    assert_eq!(rel_mutex.relation_type, "mutually_exclusive");

    // 3. 建立第三个后继节点 C 并连前置路线 (A -> C 前置，§7.3)
    let focus_c = Repository::create_focus(
        &mut conn,
        &life.id,
        "发表顶级期刊论文",
        "完成学术代表作",
        None,
        None,
        "paused",
        120.0,
        360.0,
    ).unwrap();

    let rel_pre = Repository::add_focus_relation(
        &conn,
        &life.id,
        &focus_a.id,
        &focus_c.id,
        "prerequisite",
        Some("前置学术积累"),
    ).unwrap();
    assert_eq!(rel_pre.relation_type, "prerequisite");

    // 4. 验证连线查询
    let relations = Repository::get_focus_relations(&conn, &life.id).unwrap();
    assert_eq!(relations.len(), 2);

    // 5. 更新正文与坐标 (§7.1)
    Repository::update_focus_content(
        &conn,
        &life.id,
        &focus_a.id,
        "攻读人工智能博士学位",
        "更新后的长期战略正文描述",
        None,
        None,
    ).unwrap();

    Repository::update_focus_position(&conn, &life.id, &focus_a.id, 150.0, 200.0).unwrap();

    let foci = Repository::get_foci(&conn, &life.id).unwrap();
    let updated_a = foci.iter().find(|f| f.id == focus_a.id).unwrap();
    assert_eq!(updated_a.title, "攻读人工智能博士学位");
    assert_eq!(updated_a.position_x, 150.0);
    assert_eq!(updated_a.position_y, 200.0);

    // 6. 四状态往返流转与历史记录 (§7.2 / A06)
    Repository::update_focus_status(&mut conn, &life.id, &focus_a.id, "completed", Some("论文通过答辩"), None, None).unwrap();
    Repository::update_focus_status(&mut conn, &life.id, &focus_a.id, "revoked", Some("决定撤销重选"), None, None).unwrap();
    Repository::update_focus_status(&mut conn, &life.id, &focus_a.id, "active", Some("重新启动该战略"), None, None).unwrap();

    let history = Repository::get_focus_history(&conn, &life.id, Some(&focus_a.id)).unwrap();
    assert_eq!(history.len(), 4); // 初始创建 + 3 次流转

    // 7. 删除连线与删除节点 (§15)
    Repository::delete_focus_relation(&conn, &life.id, &rel_mutex.id).unwrap();
    let relations_after = Repository::get_focus_relations(&conn, &life.id).unwrap();
    assert_eq!(relations_after.len(), 1);

    Repository::delete_focus(&mut conn, &life.id, &focus_a.id).unwrap();
    let foci_after = Repository::get_foci(&conn, &life.id).unwrap();
    assert_eq!(foci_after.len(), 2); // 剩下 B 和 C
    let rels_after_del = Repository::get_focus_relations(&conn, &life.id).unwrap();
    assert_eq!(rels_after_del.len(), 0); // 涉及 A 的连线自动清除
}

#[test]
fn test_trait_relation_delete() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "测试人生 · 特质解绑").unwrap();

    // 特质创建与解绑关系 (delete_trait_relation)
    let t1 = Repository::create_trait(&conn, &life.id, "三角洲能力等级一", "初阶心智", None).unwrap();
    let t2 = Repository::create_trait(&conn, &life.id, "三角洲能力等级二", "进阶心智", None).unwrap();

    let rel = Repository::add_trait_relation(&conn, &life.id, &t1.id, &t2.id, Some("演化")).unwrap();
    let rels = Repository::get_trait_relations(&conn, &life.id).unwrap();
    assert_eq!(rels.len(), 1);

    // 解除特质演化关系
    Repository::delete_trait_relation(&conn, &life.id, &rel.id).unwrap();
    let rels_after = Repository::get_trait_relations(&conn, &life.id).unwrap();
    assert_eq!(rels_after.len(), 0);
}

#[test]
fn test_essay_crud() {
    let state = DbState::in_memory().unwrap();
    let mut conn = state.conn.lock().unwrap();

    let life = Repository::create_life(&mut conn, "随笔测试空间").unwrap();

    // 1. 创建随笔
    let essay = Repository::create_essay(&conn, &life.id, "初期战略反思", "关于第一阶段攻坚的心得体会。").unwrap();
    assert_eq!(essay.title, "初期战略反思");
    assert_eq!(essay.body_md, "关于第一阶段攻坚的心得体会。");

    let list1 = Repository::get_essays(&conn, &life.id).unwrap();
    assert_eq!(list1.len(), 1);

    // 2. 更新随笔
    let updated = Repository::update_essay(&conn, &life.id, &essay.id, "初期战略反思 (修订版)", "深化复盘：增加反思与次要路线剪枝。").unwrap();
    assert_eq!(updated.title, "初期战略反思 (修订版)");
    assert_eq!(updated.body_md, "深化复盘：增加反思与次要路线剪枝。");

    let list2 = Repository::get_essays(&conn, &life.id).unwrap();
    assert_eq!(list2[0].title, "初期战略反思 (修订版)");

    // 3. 随笔呈现在 Archive Feed 中
    let feed = Repository::get_archive_feed(&conn, &life.id, Some("essay")).unwrap();
    assert_eq!(feed.len(), 1);
    assert_eq!(feed[0].title, "随笔: 初期战略反思 (修订版)");

    // 4. 删除随笔
    Repository::delete_essay(&conn, &life.id, &essay.id).unwrap();
    let list3 = Repository::get_essays(&conn, &life.id).unwrap();
    assert_eq!(list3.len(), 0);

    let feed_after = Repository::get_archive_feed(&conn, &life.id, Some("essay")).unwrap();
    assert_eq!(feed_after.len(), 0);
}

#[test]
fn test_trait_and_ideology_and_spirit_crud_and_delete_life() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "测试人生 · 删档与CRUD全测试").unwrap();

    // 1. Trait update & set_active_trait_stage
    let t1 = Repository::create_trait(&conn, &life.id, "能力等级一", "初阶能力", None).unwrap();
    let t2 = Repository::create_trait(&conn, &life.id, "能力等级二", "进阶能力", None).unwrap();
    Repository::add_trait_relation(&conn, &life.id, &t1.id, &t2.id, None).unwrap();

    let updated_t1 = Repository::update_trait(&conn, &life.id, &t1.id, "能力基础 (修订)", "扎实初阶能力", None).unwrap();
    assert_eq!(updated_t1.title, "能力基础 (修订)");

    // 设置 t2 为当前阶段
    let group_ids = vec![t1.id.clone(), t2.id.clone()];
    Repository::set_active_trait_stage(&conn, &life.id, &group_ids, &t2.id).unwrap();

    let traits_after = Repository::get_traits(&conn, &life.id, false).unwrap();
    let t2_fetched = traits_after.iter().find(|t| t.id == t2.id).unwrap();
    assert_eq!(t2_fetched.icon.as_deref(), Some("active"));
    let t1_fetched = traits_after.iter().find(|t| t.id == t1.id).unwrap();
    assert_eq!(t1_fetched.icon, None);

    // 2. Ideology update & delete
    let ideo = Repository::create_ideology(&conn, &life.id, "原初自由意志", "强调探索与实验", None).unwrap();
    let updated_ideo = Repository::update_ideology(&conn, &life.id, &ideo.id, "知行合一", "知者行之始，行者知之成", None).unwrap();
    assert_eq!(updated_ideo.title, "知行合一");
    assert_eq!(updated_ideo.body_md, "知者行之始，行者知之成");

    Repository::delete_ideology(&conn, &life.id, &ideo.id).unwrap();
    let ideos_after = Repository::get_ideologies(&conn, &life.id, true).unwrap();
    assert_eq!(ideos_after.len(), 0);

    // 3. NationalSpirit update & delete
    let spirit = Repository::create_national_spirit(&conn, &life.id, "资本寒冬", "阶段性紧缩", None).unwrap();
    let updated_spirit = Repository::update_national_spirit(&conn, &life.id, &spirit.id, "行业技术变革潮", "AI大模型全面重塑工作流", None).unwrap();
    assert_eq!(updated_spirit.title, "行业技术变革潮");

    Repository::delete_national_spirit(&conn, &life.id, &spirit.id).unwrap();
    let spirits_after = Repository::get_national_spirits(&conn, &life.id, true).unwrap();
    assert_eq!(spirits_after.len(), 0);

    // 4. Delete Life (删档级联删除测试)
    Repository::delete_life(&mut conn, &life.id).unwrap();
    let lives_after = Repository::list_lives(&conn).unwrap();
    assert_eq!(lives_after.len(), 0);

    // 验证级联清除：trait 和 leader 均已清空
    let traits_left = Repository::get_traits(&conn, &life.id, true).unwrap();
    assert_eq!(traits_left.len(), 0);
    let leader_left = Repository::get_leader(&conn, &life.id).unwrap();
    assert!(leader_left.is_none());
}

#[test]
fn test_active_equipped_traits_and_stage_mutual_exclusion() {
    let state = DbState::in_memory().expect("in-memory db init failed");
    let mut conn = state.conn.lock().unwrap();
    let life = Repository::create_life(&mut conn, "测试人生 · 特质上阵与阶梯互斥").unwrap();

    // 1. 创建五阶演化谱系：四角洲能力 1 -> 2 -> 3 -> 4 -> 5
    let s1 = Repository::create_trait(&conn, &life.id, "四角洲能力 等级1", "基石", None).unwrap();
    let s2 = Repository::create_trait(&conn, &life.id, "四角洲能力 等级2", "第二阶", None).unwrap();
    let s3 = Repository::create_trait(&conn, &life.id, "四角洲能力 等级3", "第三阶", None).unwrap();
    let s4 = Repository::create_trait(&conn, &life.id, "四角洲能力 等级4", "第四阶", None).unwrap();
    let s5 = Repository::create_trait(&conn, &life.id, "四角洲能力 等级5", "顶峰", None).unwrap();

    Repository::add_trait_relation(&conn, &life.id, &s1.id, &s2.id, None).unwrap();
    Repository::add_trait_relation(&conn, &life.id, &s2.id, &s3.id, None).unwrap();
    Repository::add_trait_relation(&conn, &life.id, &s3.id, &s4.id, None).unwrap();
    Repository::add_trait_relation(&conn, &life.id, &s4.id, &s5.id, None).unwrap();

    // 2. 创建二阶演化谱系：三角洲能力 1 -> 2
    let d1 = Repository::create_trait(&conn, &life.id, "三角洲能力等级一", "初阶", None).unwrap();
    let d2 = Repository::create_trait(&conn, &life.id, "三角洲能力等级二", "高阶", None).unwrap();
    Repository::add_trait_relation(&conn, &life.id, &d1.id, &d2.id, None).unwrap();

    // 3. 创建独立特质
    let standalone = Repository::create_trait(&conn, &life.id, "坚毅不拔", "独立心理特征", None).unwrap();

    // 总特质共有 5 + 2 + 1 = 8 项
    let all_traits = Repository::get_traits(&conn, &life.id, false).unwrap();
    assert_eq!(all_traits.len(), 8);

    // 4. 验证未指定活跃阶梯时的初始容灾：
    // 每条演化谱系严格只产出 1 项代表阶梯，决不允许全部 8 项并列上阵！
    let overview1 = Repository::get_world_overview(&conn, &life.id).unwrap().unwrap();
    assert_eq!(overview1.traits.len(), 3, "8项特质中应只有3项活跃上阵（四角洲1项、三角洲1项、独立特质1项）");
    assert!(overview1.traits.iter().any(|t| t.title.starts_with("四角洲能力")));
    assert!(overview1.traits.iter().any(|t| t.title.starts_with("三角洲能力")));
    assert!(overview1.traits.iter().any(|t| t.id == standalone.id));

    // 5. 标定四角洲能力所处阶段为第3阶 (s3)
    let s_group = vec![s1.id.clone(), s2.id.clone(), s3.id.clone(), s4.id.clone(), s5.id.clone()];
    Repository::set_active_trait_stage(&conn, &life.id, &s_group, &s3.id).unwrap();

    let overview2 = Repository::get_world_overview(&conn, &life.id).unwrap().unwrap();
    assert_eq!(overview2.traits.len(), 3);
    let active_s = overview2.traits.iter().find(|t| t.title.starts_with("四角洲能力")).unwrap();
    assert_eq!(active_s.id, s3.id, "活跃的必须是标定的第3阶");
    assert_eq!(active_s.title, "四角洲能力 等级3");

    // 6. 将四角洲能力整条谱系设为【待命】(下阵)
    Repository::set_trait_equipped(&conn, &life.id, &s_group, false, None).unwrap();

    let overview3 = Repository::get_world_overview(&conn, &life.id).unwrap().unwrap();
    assert_eq!(overview3.traits.len(), 2, "四角洲待命下阵后，活跃心智特质应只剩三角洲与独立特质共2项");
    assert!(!overview3.traits.iter().any(|t| t.title.starts_with("四角洲能力")));

    // 7. 将四角洲能力重新【上阵激活】，并指定激活第4阶 (s4)
    Repository::set_trait_equipped(&conn, &life.id, &s_group, true, Some(&s4.id)).unwrap();

    let overview4 = Repository::get_world_overview(&conn, &life.id).unwrap().unwrap();
    assert_eq!(overview4.traits.len(), 3);
    let active_s4 = overview4.traits.iter().find(|t| t.title.starts_with("四角洲能力")).unwrap();
    assert_eq!(active_s4.id, s4.id, "重新上阵后激活的应是指定的第4阶");
}

#[test]
fn test_cross_life_isolation_and_dag_cycle_prevention() {
    let state = DbState::in_memory().unwrap();
    let mut conn = state.conn.lock().unwrap();

    let life_a = Repository::create_life(&mut conn, "世界A").unwrap();
    let life_b = Repository::create_life(&mut conn, "世界B").unwrap();

    // 1. 创建国策
    let fa1 = Repository::create_focus(&mut conn, &life_a.id, "A1", "", None, None, "active", 0.0, 0.0).unwrap();
    let fa2 = Repository::create_focus(&mut conn, &life_a.id, "A2", "", None, None, "active", 0.0, 0.0).unwrap();
    let fa3 = Repository::create_focus(&mut conn, &life_a.id, "A3", "", None, None, "active", 0.0, 0.0).unwrap();
    let fb1 = Repository::create_focus(&mut conn, &life_b.id, "B1", "", None, None, "active", 0.0, 0.0).unwrap();

    // 跨人生空间关系拦截验证
    let cross_res = Repository::add_focus_relation(&conn, &life_a.id, &fa1.id, &fb1.id, "prerequisite", None);
    assert!(cross_res.is_err(), "跨人生空间创建国策关联必须被彻底阻断拒绝");

    // 自连接拦截验证
    let self_res = Repository::add_focus_relation(&conn, &life_a.id, &fa1.id, &fa1.id, "prerequisite", None);
    assert!(self_res.is_err(), "国策关联不能连接自身");

    // 正常添加 A1 -> A2
    Repository::add_focus_relation(&conn, &life_a.id, &fa1.id, &fa2.id, "prerequisite", None).unwrap();
    // 正常添加 A2 -> A3
    Repository::add_focus_relation(&conn, &life_a.id, &fa2.id, &fa3.id, "prerequisite", None).unwrap();

    // 环路检测：尝试添加 A3 -> A1，构成 A1 -> A2 -> A3 -> A1 环路，必须拦截！
    let cycle_res = Repository::add_focus_relation(&conn, &life_a.id, &fa3.id, &fa1.id, "prerequisite", None);
    assert!(cycle_res.is_err(), "国策前置环路必须被 DAG 检测拒绝！");

    // 互斥关系正规化验证 (min, max)
    let mx1 = Repository::add_focus_relation(&conn, &life_a.id, &fa2.id, &fa1.id, "mutually_exclusive", None).unwrap();
    let expected_src = if fa1.id < fa2.id { &fa1.id } else { &fa2.id };
    let expected_tgt = if fa1.id < fa2.id { &fa2.id } else { &fa1.id };
    assert_eq!(&mx1.source_focus_id, expected_src);
    assert_eq!(&mx1.target_focus_id, expected_tgt);

    // 2. 特质环路与跨生命周期检测
    let ta1 = Repository::create_trait(&conn, &life_a.id, "特质A1", "", None).unwrap();
    let ta2 = Repository::create_trait(&conn, &life_a.id, "特质A2", "", None).unwrap();
    let tb1 = Repository::create_trait(&conn, &life_b.id, "特质B1", "", None).unwrap();

    let cross_trait = Repository::add_trait_relation(&conn, &life_a.id, &ta1.id, &tb1.id, None);
    assert!(cross_trait.is_err(), "跨人生空间创建特质关联必须被拒绝");

    Repository::add_trait_relation(&conn, &life_a.id, &ta1.id, &ta2.id, None).unwrap();
    let cycle_trait = Repository::add_trait_relation(&conn, &life_a.id, &ta2.id, &ta1.id, None);
    assert!(cycle_trait.is_err(), "特质演化成环必须被拒绝");
}

#[test]
fn test_trait_equip_state_migration_and_integrity() {
    let state = DbState::in_memory().unwrap();
    let mut conn = state.conn.lock().unwrap();

    let life = Repository::create_life(&mut conn, "装备状态测试空间").unwrap();
    let t = Repository::create_trait(&conn, &life.id, "深度专注力", "初阶心智", None).unwrap();
    assert_eq!(t.equip_state.as_deref(), Some("unequipped"));

    let group = vec![t.id.clone()];
    Repository::set_active_trait_stage(&conn, &life.id, &group, &t.id).unwrap();

    let fetched = Repository::get_traits(&conn, &life.id, false).unwrap();
    assert_eq!(fetched[0].equip_state.as_deref(), Some("active"));

    // 验证完整导出包含完整生命周期数据
    let json_str = Repository::export_life_json(&conn, &life.id).unwrap();
    assert!(json_str.contains("\"all_foci\""));
    assert!(json_str.contains("\"focus_relations\""));
    assert!(json_str.contains("\"all_traits\""));
    assert!(json_str.contains("\"version\": 2"));
}

#[test]
fn test_export_security_and_isolation() {
    let state = DbState::in_memory().unwrap();
    let mut conn = state.conn.lock().unwrap();

    let life_a = Repository::create_life(&mut conn, "绝密世界A").unwrap();
    let life_b = Repository::create_life(&mut conn, "绝密世界B").unwrap();

    Repository::create_focus(
        &mut conn,
        &life_a.id,
        "A的专属国策",
        "保密内容A",
        None,
        None,
        "active",
        0.0,
        0.0,
    )
    .unwrap();

    Repository::create_focus(
        &mut conn,
        &life_b.id,
        "B的专属国策",
        "保密内容B",
        None,
        None,
        "active",
        0.0,
        0.0,
    )
    .unwrap();

    // 1. 验证 JSON 导出严格隔离且无任何 API 密钥泄漏
    let json_a = Repository::export_life_json(&conn, &life_a.id).unwrap();
    assert!(json_a.contains("A的专属国策"));
    assert!(!json_a.contains("B的专属国策"));
    assert!(!json_a.contains("保密内容B"));
    assert!(!json_a.contains("api_key"));
    assert!(!json_a.contains("apiKey"));
    assert!(!json_a.contains("Bearer"));

    // 2. 验证 Markdown 导出严格隔离
    let md_a = Repository::export_life_markdown(&conn, &life_a.id).unwrap();
    assert!(md_a.contains("绝密世界A"));
    assert!(md_a.contains("A的专属国策"));
    assert!(!md_a.contains("绝密世界B"));
    assert!(!md_a.contains("B的专属国策"));
    assert!(!md_a.contains("api_key"));
}



