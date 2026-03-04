<?php
// api.php
require_once 'db_config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_SESSION['user_id'];

try {
    if ($action === 'read') {
        $stmt = $pdo->prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $invoices = $stmt->fetchAll();

        foreach ($invoices as &$invoice) {
            $stmt_items = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
            $stmt_items->execute([$invoice['id']]);
            $invoice['items'] = $stmt_items->fetchAll();
        }
        echo json_encode($invoices);
        exit;
    }

    if ($action === 'customers_read') {
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC");
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        if ($action === 'customers_create') {
            $stmt = $pdo->prepare("INSERT INTO customers (user_id, name, phone, email, address, dob) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $user_id, 
                $data['name'], 
                $data['phone'], 
                $data['email'] ?? '', 
                $data['address'] ?? '', 
                $data['dob'] ?? ''
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            exit;
        }

        if ($action === 'customers_update') {
            $stmt = $pdo->prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, dob=? WHERE id=? AND user_id=?");
            $stmt->execute([
                $data['name'], 
                $data['phone'], 
                $data['email'] ?? '', 
                $data['address'] ?? '', 
                $data['dob'] ?? '', 
                $data['id'], 
                $user_id
            ]);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'customers_delete') {
            $stmt = $pdo->prepare("DELETE FROM customers WHERE id=? AND user_id=?");
            $stmt->execute([$data['id'], $user_id]);
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'create') {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO invoices (user_id, customer_name, total) VALUES (?, ?, ?)");
                $stmt->execute([$user_id, $data['customer_name'], $data['total']]);
                $invoice_id = $pdo->lastInsertId();

                $stmt_item = $pdo->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, discount, gst_rate, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['items'] as $item) {
                    $stmt_item->execute([
                        $invoice_id, 
                        $item['item_name'], 
                        $item['price'], 
                        $item['quantity'], 
                        $item['discount'] ?? 0, 
                        $item['gst_rate'] ?? 0, 
                        $item['subtotal']
                    ]);
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'id' => $invoice_id]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            exit;
        }

        if ($action === 'update') {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE invoices SET customer_name=?, total=? WHERE id=? AND user_id=?");
                $stmt->execute([$data['customer_name'], $data['total'], $data['id'], $user_id]);
                $invoice_id = $data['id'];

                $stmt_del = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id=?");
                $stmt_del->execute([$invoice_id]);

                $stmt_item = $pdo->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, discount, gst_rate, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['items'] as $item) {
                    $stmt_item->execute([
                        $invoice_id, 
                        $item['item_name'], 
                        $item['price'], 
                        $item['quantity'], 
                        $item['discount'] ?? 0, 
                        $item['gst_rate'] ?? 0, 
                        $item['subtotal']
                    ]);
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            exit;
        }

        if ($action === 'delete') {
            $stmt = $pdo->prepare("DELETE FROM invoices WHERE id=? AND user_id=?");
            $stmt->execute([$data['id'], $user_id]);
            
            // invoice_items will be deleted by CASCADE if supported, but let's be safe
            $stmt_del = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id=?");
            $stmt_del->execute([$data['id']]);
            
            echo json_encode(['success' => true]);
            exit;
        }
    }

    echo json_encode(['error' => 'Invalid action or method']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
