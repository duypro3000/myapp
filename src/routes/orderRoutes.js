const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const orderModel = require('../models/orderModel');

router.get('/orders/:number', ensureAuthenticated, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const orderNumber = req.params.number;
    
    const orderBase = await orderModel.findByNumber(orderNumber, userId);
    
    if (!orderBase) {
      return res.status(404).render('pages/static', { 
        title: 'Không tìm thấy', 
        content: '<p>Đơn hàng không tồn tại hoặc bạn không có quyền xem.</p>' 
      });
    }
    const order = await orderModel.findDetailsById(orderBase.id);

    if (!order) {
      return res.status(404).render('pages/static', { 
        title: 'Không tìm thấy', 
        content: '<p>Lỗi khi tải chi tiết đơn hàng.</p>' 
      });
    }
    res.render('pages/order-detail', { 
      title: `Chi tiết Đơn hàng #${order.order_number}`, 
      order: order 
    });
    
  } catch (e) { 
    next(e); 
  }
});

module.exports = router;